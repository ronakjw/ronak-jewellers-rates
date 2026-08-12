import { adminDb } from "../../../../lib/firebaseAdmin";
import { getFivePaisaCreds, getStoredFivePaisaSession } from "../../../../lib/fivepaisaAdmin";

export const dynamic = "force-dynamic";

// 5paisa's public Scrip Master is 160,000+ rows (several MB) — far too
// large to refetch and reparse on every request, and too large to cache
// as a whole in a single Firestore document (1 MiB limit). Instead we
// resolve just the two rows we actually need (today's active SILVER and
// GOLD contracts) and cache *those* — a few hundred bytes — in Firestore,
// which is guaranteed to persist across invocations/cold starts, unlike
// an in-memory variable or Next's fetch cache under force-dynamic routes.
const CONTRACT_CACHE_MS = 6 * 60 * 60 * 1000;

function settingsSignature(settings) {
  return [
    settings.autoContract ? "auto" : "manual",
    settings.manualContract || "",
    settings.goldManualContract || "",
  ].join("|");
}

// Only the fields fetchMarketFeed/fetchMarketDepth/display code actually use.
function toStoredRow(row) {
  if (!row) return null;
  return {
    Exch: row.Exch,
    ExchType: row.ExchType,
    ScripCode: row.ScripCode,
    Name: row.Name,
    Expiry: row.Expiry,
    FullName: row.FullName,
    SymbolRoot: row.SymbolRoot,
  };
}

async function fetchAndParseScripMaster() {
  const response = await fetch(
    "https://Openapi.5paisa.com/VendorsAPI/Service1.svc/ScripMaster/segment/All",
    { cache: "no-store" }
  );

  const csv = await response.text();
  const lines = csv.trim().split("\n");
  const headers = lines[0].split(",").map((h) => h.trim());

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return headers.reduce((obj, key, index) => {
      obj[key] = values[index];
      return obj;
    }, {});
  });
}

// Returns { silverRow, goldRow, goldError } using the Firestore-cached
// resolution when valid, only falling back to the full 160k-row fetch when
// the cache is stale or the admin's contract settings have changed.
async function getResolvedContracts(settings) {
  const ref = adminDb.collection("system").doc("fivepaisa-contracts");
  const signature = settingsSignature(settings);
  const snap = await ref.get();
  const cached = snap.data();

  const isFresh =
    cached &&
    cached.signature === signature &&
    cached.updatedAt &&
    Date.now() - new Date(cached.updatedAt).getTime() < CONTRACT_CACHE_MS;

  if (isFresh) {
    return {
      silverRow: cached.silverRow || null,
      goldRow: cached.goldRow || null,
      goldError: cached.goldError || "",
    };
  }

  // Cache miss/stale/settings changed — do the expensive full fetch+parse,
  // but only now, not on every request.
  const rows = await fetchAndParseScripMaster();

  const silverRow = settings.autoContract
    ? getActiveScripRow(rows, "SILVER")
    : getScripRowBySymbol(rows, settings.manualContract);

  let goldRow = null;
  let goldError = "";

  try {
    goldRow = settings.goldManualContract
      ? getScripRowBySymbol(rows, settings.goldManualContract)
      : getActiveScripRow(rows, "GOLD");

    if (settings.goldManualContract && !goldRow) {
      goldError = `Gold manual contract "${settings.goldManualContract}" not found in scrip master`;
    }
  } catch (err) {
    goldError = err.message || "No active GOLD futures contract found";
  }

  await ref.set({
    signature,
    updatedAt: new Date().toISOString(),
    silverRow: toStoredRow(silverRow),
    goldRow: toStoredRow(goldRow),
    goldError,
  });

  return { silverRow, goldRow, goldError };
}

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

// 5paisa's live-quote endpoints (MarketFeed/MarketDepth) have no Open field,
// but their Historical Candles API does — the same source Kite's OHLC data
// ultimately comes from. We fetch today's daily candle once and cache it in
// Firestore for the rest of the day, rather than approximating from our own
// polling. If called before the market has printed today's candle yet, we
// get null back and retry (throttled) rather than caching a permanent miss.
const OPENING_RETRY_MS = 5 * 60 * 1000; // don't hammer the API before market open

async function fetchDailyOpen({ apiKey, accessToken, row }) {
  if (!row) return null;

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
  const url =
    `https://Openapi.5paisa.com/V2/historical/${row.Exch}/${row.ExchType}/${row.ScripCode}/1d` +
    `?from=${today}&end=${today}`;

  try {
    const response = await fetch(url, {
      headers: { Authorization: `bearer ${accessToken}` },
      cache: "no-store",
    });

    const data = await response.json();
    const candles = data?.data?.candles || [];

    // Only accept a candle actually dated today — don't fall back to
    // whatever the API happens to return if today's candle doesn't exist yet.
    const todaysCandle = candles.find((c) => String(c[0]).startsWith(today));
    if (!todaysCandle) return null;

    const open = Number(todaysCandle[1]);
    return Number.isFinite(open) && open > 0 ? open : null;
  } catch {
    return null;
  }
}

async function getOpeningPrices({ apiKey, accessToken, silverRow, goldRow }) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
  const ref = adminDb.collection("system").doc("fivepaisa-opening");
  const snap = await ref.get();
  const cached = snap.data();
  const now = Date.now();

  const needSilver =
    !cached || cached.date !== today || cached.silverOpen == null;
  const needGold =
    goldRow && (!cached || cached.date !== today || cached.goldOpen == null);

  const staleEnoughToRetry =
    !cached?.lastAttemptAt || now - new Date(cached.lastAttemptAt).getTime() > OPENING_RETRY_MS;

  if (cached && cached.date === today && !needSilver && !needGold) {
    return { silverOpen: cached.silverOpen, goldOpen: cached.goldOpen ?? null };
  }

  if (cached && cached.date === today && !staleEnoughToRetry) {
    // We already tried recently and at least one side is still missing —
    // don't spam the historical API, just return what we have so far.
    return { silverOpen: cached.silverOpen ?? null, goldOpen: cached.goldOpen ?? null };
  }

  const [silverOpen, goldOpen] = await Promise.all([
    needSilver ? fetchDailyOpen({ apiKey, accessToken, row: silverRow }) : Promise.resolve(cached?.silverOpen ?? null),
    needGold ? fetchDailyOpen({ apiKey, accessToken, row: goldRow }) : Promise.resolve(cached?.goldOpen ?? null),
  ]);

  await ref.set({
    date: today,
    silverOpen: silverOpen ?? null,
    goldOpen: goldOpen ?? null,
    lastAttemptAt: new Date().toISOString(),
  });

  return { silverOpen: silverOpen ?? null, goldOpen: goldOpen ?? null };
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
    const { silverRow, goldRow, goldError: resolvedGoldError } = await getResolvedContracts(settings);
    let goldError = resolvedGoldError;
    const goldMode = settings.goldManualContract ? "manual" : "auto";

    if (!silverRow) {
      return {
        success: false,
        message: settings.autoContract
          ? "No active SILVER futures contract found"
          : `Silver manual contract "${settings.manualContract}" not found in scrip master`,
      };
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
      apiKey,
      accessToken: session.accessToken,
      silverRow,
      goldRow,
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
