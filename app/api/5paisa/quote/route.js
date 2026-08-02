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
    { cache: "no-store" }
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
    .filter((price) => Number.isFinite(price));

  const sellPrices = levels
    .filter((level) => Number(level.BbBuySellFlag) === 83)
    .map((level) => Number(level.Price))
    .filter((price) => Number.isFinite(price));

  return {
    bestBid: buyPrices.length ? Math.max(...buyPrices) : null,
    bestAsk: sellPrices.length ? Math.min(...sellPrices) : null,
  };
}

export async function GET() {
  try {
    const { apiKey } = getFivePaisaCreds();
    const session = await getStoredFivePaisaSession();

    if (!apiKey || !session) {
      return Response.json({
        success: false,
        message: "5paisa session missing or expired. Reconnect from the admin panel.",
      });
    }

    const settings = await getSettings();
    const rows = await getScripRows();

    const silverRow = settings.autoContract
      ? getActiveScripRow(rows, "SILVER")
      : getScripRowBySymbol(rows, settings.manualContract);

    if (!silverRow) {
      return Response.json({ success: false, message: "No silver contract selected" });
    }

    let goldRow = null;
    let goldError = "";
    const goldMode = settings.goldManualContract ? "manual" : "auto";

    try {
      goldRow = settings.goldManualContract
        ? getScripRowBySymbol(rows, settings.goldManualContract)
        : getActiveScripRow(rows, "GOLD");
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
      return Response.json({
        success: false,
        contract: silverRow.Name,
        message: "Silver quote not found",
      });
    }

    if (goldRow && !goldFeed) {
      goldError = "Gold quote not found";
    }

    // Bid/ask come from the MarketDepth order book. If the book is empty
    // (illiquid moment, or market closed), fall back to last traded price —
    // same fallback pattern the Kite integration used.
    const silverBuy = silverDepth?.bestBid ?? silverFeed.LastRate ?? null;
    const silverSell = silverDepth?.bestAsk ?? silverFeed.LastRate ?? null;
    const goldBuy = goldDepth?.bestBid ?? goldFeed?.LastRate ?? null;
    const goldSell = goldDepth?.bestAsk ?? goldFeed?.LastRate ?? null;

    return Response.json({
      success: true,
      provider: "5paisa",

      contract: silverRow.Name,
      mode: settings.autoContract ? "auto" : "manual",
      mcxBuyPrice: silverBuy,
      mcxSellPrice: silverSell,
      lastPrice: silverFeed.LastRate ?? null,
      mcxOpeningRate: null,
      mcxClosingRate: silverFeed.PClose ?? null,
      silverClosingSource: "market_feed_pclose",
      silverPriceSource: silverDepth?.bestBid || silverDepth?.bestAsk ? "market_depth" : "last_rate_fallback",

      goldContract: goldRow?.Name || "",
      goldMode,
      goldError,
      goldMcxBuyPrice: goldBuy,
      goldMcxSellPrice: goldSell,
      goldLastPrice: goldFeed?.LastRate ?? null,
      goldOpeningRate: null,
      goldClosingRate: goldFeed?.PClose ?? null,
      goldClosingSource: "market_feed_pclose",
      goldPriceSource: goldDepth?.bestBid || goldDepth?.bestAsk ? "market_depth" : "last_rate_fallback",

      timestamp: silverFeed.TickDt || null,
      lastTradeTime: silverFeed.TickDt || null,
    });
  } catch (err) {
    return Response.json({
      success: false,
      message: err.message || "Unable to fetch quote",
    });
  }
}
