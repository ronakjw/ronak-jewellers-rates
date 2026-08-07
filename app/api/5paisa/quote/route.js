import { adminDb } from "../../../../lib/firebaseAdmin";
import { getFivePaisaCreds, getStoredFivePaisaSession } from "../../../../lib/fivepaisaAdmin";

export const dynamic = "force-dynamic";

let cachedScripRows = null;
let cachedScripRowsAt = 0;
const SCRIP_CACHE_MS = 6 * 60 * 60 * 1000;

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let insideQuotes = false;

  for (const char of line) {
    if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === "," && !insideQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

function toBool(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function cleanSymbol(value) {
  return String(value || "").trim().toUpperCase();
}

async function getSettings() {
  const snap = await adminDb.collection("settings").doc("bullion").get();
  const data = snap.data() || {};
  const contractMode = String(data.contractMode || "").toLowerCase();

  return {
    autoContract:
      contractMode === "auto"
        ? true
        : contractMode === "manual"
        ? false
        : toBool(data.autoContract, true),

    manualContract: cleanSymbol(data.manualContract),

    goldManualContract: cleanSymbol(
      data.GoldManualContract || data.goldManualContract
    ),

    holidayMode: toBool(data.holidayMode, false),
  };
}

// 5paisa's public Scrip Master — same idea as Kite's /instruments/MCX dump.
// Every row's exact column set can vary slightly by segment, so we read
// headers dynamically instead of assuming fixed positions.
async function getScripRows() {
  const now = Date.now();

  if (cachedScripRows && now - cachedScripRowsAt < SCRIP_CACHE_MS) {
    return cachedScripRows;
  }

  const response = await fetch(
    "https://Openapi.5paisa.com/VendorsAPI/Service1.svc/ScripMaster/segment/All",
    { next: { revalidate: 21600 } } // 6 hours — this file is 160k+ rows; Next's
    // platform-level cache persists across invocations/cold starts, unlike
    // the module-level cache below which only helps within a single warm instance.
  );

  const csv = await response.text();
  const lines = csv.trim().split("\n");
  const headers = lines[0].split(",").map((h) => h.trim());

  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);

    return headers.reduce((obj, key, index) => {
      obj[key] = values[index];
      return obj;
    }, {});
  });

  cachedScripRows = rows;
  cachedScripRowsAt = now;

  return rows;
}
function isMcxCommodityRow(row, commodityName) {
  return (
    row.Exch === "M" &&
    row.ExchType === "D" &&
    row.ScripType === "XX" &&
    String(row.SymbolRoot || "").toUpperCase() === commodityName &&
    row.Expiry
  );
}

function getActiveScripRow(rows, commodityName) {
  const today = new Date();

  const futures = rows
    .filter((row) => isMcxCommodityRow(row, commodityName) && new Date(row.Expiry) >= today)
    .sort((a, b) => new Date(a.Expiry) - new Date(b.Expiry));

  const active = futures[0];

  if (!active) {
    throw new Error(`No active ${commodityName} futures contract found`);
  }

  return active;
}

function getScripRowBySymbol(rows, symbol) {
  const clean = cleanSymbol(symbol);
  if (!clean) return null;

  return (
    rows.find(
      (row) =>
        cleanSymbol(row.Name) === clean ||
        cleanSymbol(row.FullName).includes(clean)
    ) || null
  );
}

async function fetchMarketFeed({ apiKey, accessToken, clientCode, rows }) {
  const marketFeedData = rows.map((row) => ({
    Exch: row.Exch,
    ExchType: row.ExchType,
    ScripCode: String(row.ScripCode),
    ScripData: "",
  }));

  const response = await fetch(
    "https://Openapi.5paisa.com/VendorsAPI/Service1.svc/V1/MarketFeed",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `bearer ${accessToken}`,
      },
      body: JSON.stringify({
        head: { key: apiKey },
        body: {
          ClientCode: clientCode,
          MarketFeedData: marketFeedData,
          LastRequestTime: "/Date(0)/",
          RefreshRate: "H",
        },
      }),
      cache: "no-store",
    }
  );

  const data = await response.json();
  const items = data?.body?.Data || [];

  const byScripCode = new Map(items.map((item) => [String(item.Token), item]));

  return rows.map((row) => byScripCode.get(String(row.ScripCode)) || null);
}

// MarketDepth is a single-scrip call (no batching like MarketFeed), and
// returns up to 5 buy levels + 5 sell levels rather than OHLC data. Best
// bid = highest price among Buy (66) entries; best ask = lowest price
// among Sell (83) entries — the API doesn't guarantee the array is sorted.
async function fetchMarketDepth({ apiKey, accessToken, clientCode, row }) {
  const response = await fetch(
    "https://Openapi.5paisa.com/VendorsAPI/Service1.svc/V2/MarketDepth",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `bearer ${accessToken}`,
      },
      body: JSON.stringify({
        head: { key: apiKey },
        body: {
          ClientCode: clientCode,
          Exchange: row.Exch,
          ExchangeType: row.ExchType,
          ScripCode: Number(row.ScripCode),
          ScripData: "",
        },
      }),
      cache: "no-store",
    }
  );

  const data = await response.json();
  const levels = data?.body?.MarketDepthData || [];

  const buyPrices = levels
    .filter((level) => Number(level.BbBuySellFlag) === 66)
    .map((level) => Number(level.Price))
    .filter((price) => Number.isFinite(price) && price > 0);

  const sellPrices = levels
    .filter((level) => Number(level.BbBuySellFlag) === 83)
    .map((level) => Number(level.Price))
    .filter((price) => Number.isFinite(price) && price > 0);

  return {
    bestBid: buyPrices.length ? Math.max(...buyPrices) : null,
    bestAsk: sellPrices.length ? Math.min(...sellPrices) : null,
  };
}

// 5paisa's MarketFeed API has no "open" field (unlike Kite's OHLC data), so
// there's no real opening price to read. As the closest practical stand-in,
// we record the first successful price seen each IST trading day and reuse
// it for the rest of the day. This resets automatically at IST midnight,
// and backfills a missing side (e.g. gold) if it wasn't available on the
// very first call of the day but shows up on a later one — without ever
// overwriting an opening price already captured for today.
async function getOpeningPrices({ silverPrice, goldPrice }) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
  const ref = adminDb.collection("system").doc("fivepaisa-opening");

  return adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data();

    if (data && data.date === today) {
      const patch = {};
      if (data.silverOpen == null && silverPrice != null) patch.silverOpen = silverPrice;
      if (data.goldOpen == null && goldPrice != null) patch.goldOpen = goldPrice;

      if (Object.keys(patch).length) {
        tx.set(ref, patch, { merge: true });
      }

      return {
        silverOpen: patch.silverOpen ?? data.silverOpen ?? null,
        goldOpen: patch.goldOpen ?? data.goldOpen ?? null,
      };
    }

    // New trading day (or first run ever) — this call's prices become today's opening.
    const record = {
      date: today,
      silverOpen: silverPrice ?? null,
      goldOpen: goldPrice ?? null,
    };
    tx.set(ref, record);
    return { silverOpen: record.silverOpen, goldOpen: record.goldOpen };
  });
}

// Exported as a plain function (not just a route handler) so /api/quote can
// call this directly in-process instead of making a separate HTTP request to
// this route — that HTTP round-trip was costing an entire extra serverless
// invocation for every single quote refresh.
export async function getFivePaisaQuote() {
  try {
    const { apiKey } = getFivePaisaCreds();
    const session = await getStoredFivePaisaSession();

    if (!apiKey || !session) {
      return {
        success: false,
        message: "5paisa session missing or expired. Reconnect from the admin panel.",
      };
    }

    const settings = await getSettings();
    const rows = await getScripRows();

    const silverRow = settings.autoContract
      ? getActiveScripRow(rows, "SILVER")
      : getScripRowBySymbol(rows, settings.manualContract);

    if (!silverRow) {
      return {
        success: false,
        message: settings.autoContract
          ? "No active SILVER futures contract found"
          : `Silver manual contract "${settings.manualContract}" not found in scrip master`,
      };
    }

    let goldRow = null;
    let goldError = "";
    const goldMode = settings.goldManualContract ? "manual" : "auto";

    try {
      if (settings.goldManualContract) {
        goldRow = getScripRowBySymbol(rows, settings.goldManualContract);
        if (!goldRow) {
          goldError = `Gold manual contract "${settings.goldManualContract}" not found in scrip master`;
        }
      } else {
        goldRow = getActiveScripRow(rows, "GOLD");
      }
    } catch (err) {
      goldError = err.message || "No active GOLD futures contract found";
    }

    const feedRows = goldRow ? [silverRow, goldRow] : [silverRow];

    const [[silverFeed, goldFeed], depthResults] = await Promise.all([
      fetchMarketFeed({
        apiKey,
        accessToken: session.accessToken,
        clientCode: session.clientCode,
        rows: feedRows,
      }),
      Promise.all(
        feedRows.map((row) =>
          fetchMarketDepth({
            apiKey,
            accessToken: session.accessToken,
            clientCode: session.clientCode,
            row,
          })
        )
      ),
    ]);

    const [silverDepth, goldDepth] = depthResults;

    if (!silverFeed) {
      return {
        success: false,
        contract: silverRow.Name,
        message: "Silver quote not found",
      };
    }

    if (goldRow && !goldFeed) {
      goldError = "Gold quote not found";
    }

    const openings = await getOpeningPrices({
      silverPrice: silverFeed.LastRate ?? null,
      goldPrice: goldFeed?.LastRate ?? null,
    });

    // Bid/ask come from the MarketDepth order book. If the book is empty
    // (illiquid moment, or market closed), fall back to last traded price —
    // same fallback pattern the Kite integration used.
    const silverBuy = silverDepth?.bestBid ?? silverFeed.LastRate ?? null;
    const silverSell = silverDepth?.bestAsk ?? silverFeed.LastRate ?? null;
    const goldBuy = goldDepth?.bestBid ?? goldFeed?.LastRate ?? null;
    const goldSell = goldDepth?.bestAsk ?? goldFeed?.LastRate ?? null;

    return {
      success: true,
      provider: "5paisa",

      contract: silverRow.Name,
      mode: settings.autoContract ? "auto" : "manual",
      mcxBuyPrice: silverBuy,
      mcxSellPrice: silverSell,
      lastPrice: silverFeed.LastRate ?? null,
      mcxOpeningRate: openings.silverOpen,
      mcxClosingRate: silverFeed.PClose ?? null,
      silverClosingSource: "market_feed_pclose",
      silverPriceSource: silverDepth?.bestBid || silverDepth?.bestAsk ? "market_depth" : "last_rate_fallback",

      goldContract: goldRow?.Name || "",
      goldMode,
      goldError,
      goldMcxBuyPrice: goldBuy,
      goldMcxSellPrice: goldSell,
      goldLastPrice: goldFeed?.LastRate ?? null,
      goldOpeningRate: openings.goldOpen,
      goldClosingRate: goldFeed?.PClose ?? null,
      goldClosingSource: "market_feed_pclose",
      goldPriceSource: goldDepth?.bestBid || goldDepth?.bestAsk ? "market_depth" : "last_rate_fallback",

      timestamp: silverFeed.TickDt || null,
      lastTradeTime: silverFeed.TickDt || null,
    };
  } catch (err) {
    return {
      success: false,
      message: err.message || "Unable to fetch quote",
    };
  }
}

export async function GET() {
  return Response.json(await getFivePaisaQuote());
}
