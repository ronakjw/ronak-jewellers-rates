import { adminDb } from "../../../../lib/firebaseAdmin";
import { getFivePaisaCreds, getStoredFivePaisaSession } from "../../../../lib/fivepaisaAdmin";

export const dynamic = "force-dynamic";

// 5paisa's public Scrip Master is huge (160,000+ rows in the "All" dump), so
// we never read it on a normal request. We resolve just the contracts we need
// (silver + gold), cache those few hundred bytes in Firestore, and only touch
// the big file when that cache is stale or your contract settings change.
const CONTRACT_CACHE_MS = 6 * 60 * 60 * 1000; // a good resolution is reused for 6h
const GOLD_RETRY_MS = 30 * 60 * 1000; // if gold wasn't found, look again sooner
const RESOLVE_RETRY_MS = 5 * 60 * 1000; // after a failed lookup, wait before re-downloading

// MCX-only dump first (far smaller, if 5paisa serves that segment name), then
// the full "All" dump that is known to work. A bad/unknown first URL is harmless.
const SCRIP_MASTER_URLS = [
  "https://Openapi.5paisa.com/VendorsAPI/Service1.svc/ScripMaster/segment/mcx_fo",
  "https://Openapi.5paisa.com/VendorsAPI/Service1.svc/ScripMaster/segment/All",
];

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
    Expiry: row.Expiry || "",
    FullName: row.FullName || "",
    SymbolRoot: row.SymbolRoot || "",
  };
}

function normalizeName(value) {
  return String(value || "").toUpperCase().replace(/\s+/g, " ").trim();
}

// Emergency lever: type a scrip code (or "NAME | CODE") into the manual
// contract box and we use it directly, with no scrip-master lookup at all.
// e.g.  495214   or   SILVER 04 DEC 2026 | 495214
function parseContractOverride(text) {
  const match = normalizeName(text).match(/^(?:(.+?)\s*[|:]\s*)?(\d{3,9})$/);
  if (!match) return null;

  return {
    Exch: "M",
    ExchType: "D",
    ScripCode: match[2],
    Name: match[1] || `SCRIP ${match[2]}`,
    Expiry: "",
    FullName: "",
    SymbolRoot: "",
  };
}

function isStillValid(row) {
  if (!row) return false;
  if (!row.Expiry) return true; // scrip-code overrides carry no expiry
  return new Date(row.Expiry) >= new Date();
}

async function downloadScripMaster(url) {
  const response = await fetch(url, { cache: "no-store" });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${text.slice(0, 100).replace(/\s+/g, " ")}`);
  }

  const lines = text.split(/\r?\n/).filter(Boolean);
  const headers = (lines[0] || "").split(",").map((h) => h.trim());

  if (!["Exch", "ExchType", "ScripCode", "Name"].every((h) => headers.includes(h))) {
    throw new Error(`unexpected format, starts with: ${text.slice(0, 100).replace(/\s+/g, " ")}`);
  }

  // Exch is the first column in 5paisa's dump, so MCX lines start with "M,".
  // Skipping the other ~150k lines cuts parsing work by more than 90%.
  const mcxOnlyFastPath = headers.indexOf("Exch") === 0;
  const rows = [];

  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (mcxOnlyFastPath && !line.startsWith("M,")) continue;

    const values = parseCsvLine(line);
    const row = {};
    headers.forEach((key, index) => {
      row[key] = String(values[index] ?? "").trim();
    });
    if (row.Exch === "M") rows.push(row);
  }

  if (!rows.length) {
    throw new Error(`no MCX rows among ${lines.length - 1} rows`);
  }

  return { rows, total: lines.length - 1 };
}

async function loadScripMaster() {
  const failures = [];

  for (const url of SCRIP_MASTER_URLS) {
    const label = url.split("/").pop();
    try {
      const { rows, total } = await downloadScripMaster(url);
      return { rows, total, source: label };
    } catch (err) {
      failures.push(`${label}: ${err.message}`);
    }
  }

  throw new Error(`Scrip master download failed (${failures.join(" | ")})`);
}

function describeScripMaster(rows, total, source, root) {
  const named = rows.filter((r) => String(r.Name || "").toUpperCase().startsWith(root));
  const futures = named.filter((r) => isMcxFuture(r, root));
  const samples = futures.slice(0, 3).map((r) => `${r.Name} [${r.Expiry}]`).join("; ");

  return (
    `scrip master "${source}": ${total} rows, ${rows.length} MCX, ` +
    `${named.length} named ${root}*, ${futures.length} plain ${root} futures` +
    (samples ? `, e.g. ${samples}` : "")
  );
}

function fromCache(cached) {
  return {
    silverRow: cached.silverRow || null,
    goldRow: isStillValid(cached.goldRow) ? cached.goldRow : null,
    goldError: cached.goldError || "",
  };
}

// Returns { silverRow, goldRow, goldError }.
// - A good result is cached; a FAILED lookup is never cached as if it were an answer.
// - After a failure we wait a few minutes before re-downloading, so a broken
//   download can't make every request hammer 5paisa.
// - If a refresh fails but the last good silver contract hasn't expired, keep using it.
async function getResolvedContracts(settings) {
  const ref = adminDb.collection("system").doc("fivepaisa-contracts");
  const signature = settingsSignature(settings);
  const cached = (await ref.get()).data();
  const now = Date.now();

  const sameSettings = Boolean(cached) && cached.signature === signature;
  const staleUsable = sameSettings && isStillValid(cached.silverRow);

  if (sameSettings && cached.silverRow) {
    const age = now - new Date(cached.updatedAt || 0).getTime();
    const ttl = cached.goldError ? GOLD_RETRY_MS : CONTRACT_CACHE_MS;
    if (age < ttl && isStillValid(cached.silverRow)) return fromCache(cached);
  }

  if (
    cached &&
    cached.failedSignature === signature &&
    cached.failedAt &&
    now - new Date(cached.failedAt).getTime() < RESOLVE_RETRY_MS
  ) {
    if (staleUsable) return fromCache(cached);
    throw new Error(`${cached.failMessage} (will retry automatically in a few minutes)`);
  }

  const silverOverride = settings.autoContract ? null : parseContractOverride(settings.manualContract);
  const goldOverride = settings.goldManualContract ? parseContractOverride(settings.goldManualContract) : null;

  let rows = null;
  let total = 0;
  let source = "";
  let lookupError = "";

  const silverNeedsRows = settings.autoContract || !silverOverride;
  const goldNeedsRows = !goldOverride;

  if (silverNeedsRows || goldNeedsRows) {
    try {
      ({ rows, total, source } = await loadScripMaster());
    } catch (err) {
      lookupError = err.message;
    }
  } else {
    source = "scrip-code override";
  }

  let silverRow = null;
  let silverError = "";

  if (silverOverride && !settings.autoContract) {
    silverRow = silverOverride;
  } else if (rows) {
    try {
      silverRow = settings.autoContract
        ? getActiveScripRow(rows, "SILVER")
        : getScripRowBySymbol(rows, settings.manualContract);
      if (!silverRow) {
        silverError = `Silver manual contract "${settings.manualContract}" not found`;
      }
    } catch (err) {
      silverError = err.message;
    }
    if (!silverRow) silverError += ` (${describeScripMaster(rows, total, source, "SILVER")})`;
  } else {
    silverError = lookupError;
  }

  if (!silverRow) {
    // Stored separately from the cached rows so it never gets mistaken for a
    // good result, and tied to the current settings so changing them retries at once.
    await ref.set(
      { failedAt: new Date().toISOString(), failMessage: silverError, failedSignature: signature },
      { merge: true }
    );
    if (staleUsable) return fromCache(cached);
    throw new Error(silverError);
  }

  let goldRow = null;
  let goldError = "";

  if (goldOverride) {
    goldRow = goldOverride;
  } else if (rows) {
    try {
      goldRow = settings.goldManualContract
        ? getScripRowBySymbol(rows, settings.goldManualContract)
        : getActiveScripRow(rows, "GOLD");
      if (!goldRow) {
        goldError = `Gold manual contract "${settings.goldManualContract}" not found in scrip master`;
      }
    } catch (err) {
      goldError = err.message || "No active GOLD futures contract found";
    }
  } else {
    goldError = `Gold contract lookup unavailable: ${lookupError}`;
  }

  await ref.set({
    signature,
    updatedAt: new Date().toISOString(),
    source,
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

// Expiry normally comes as "2026-12-04"; if that column is ever missing or
// unparseable, fall back to the date embedded in the contract name.
function rowExpiry(row) {
  const direct = new Date(row.Expiry);
  if (row.Expiry && !Number.isNaN(direct.getTime())) return direct;

  const fromName = String(row.Name || "").match(/(\d{1,2}) ([A-Z]{3}) (\d{4})$/i);
  if (!fromName) return null;

  const parsed = new Date(`${fromName[1]} ${fromName[2]} ${fromName[3]} 00:00:00 UTC`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

// A plain MCX future for `root` (SILVER / GOLD) — not options, not the
// mini/micro variants (SILVERM, GOLDM, ...). Matches either by 5paisa's
// column values or by the "SILVER 04 DEC 2026" name pattern, so one of the
// two still works if 5paisa tweaks a column.
function isMcxFuture(row, root) {
  if (String(row.Exch || "").toUpperCase() !== "M") return false;

  const byColumns =
    row.ExchType === "D" &&
    row.ScripType === "XX" &&
    String(row.SymbolRoot || "").toUpperCase() === root;

  const byName = new RegExp(`^${root} \\d{1,2} [A-Z]{3} \\d{4}$`).test(normalizeName(row.Name));

  return byColumns || byName;
}

function getActiveScripRow(rows, root) {
  const now = new Date();

  const futures = rows
    .filter((row) => isMcxFuture(row, root))
    .map((row) => ({ row, expiry: rowExpiry(row) }))
    .filter(({ expiry }) => expiry && expiry >= now)
    .sort((a, b) => a.expiry - b.expiry);

  if (!futures.length) {
    throw new Error(`No active ${root} futures contract found`);
  }

  return futures[0].row;
}

// Manual contract: exact contract name on MCX, ignoring case and extra spaces.
function getScripRowBySymbol(rows, symbol) {
  const clean = normalizeName(symbol);
  if (!clean) return null;

  return (
    rows.find(
      (row) =>
        String(row.Exch || "").toUpperCase() === "M" &&
        normalizeName(row.Name) === clean
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

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      `5paisa MarketFeed returned an unexpected response (HTTP ${response.status}): ${text.slice(0, 100).replace(/\s+/g, " ")}`
    );
  }

  const items = data?.body?.Data || [];

  if (!items.length && (!response.ok || String(data?.head?.status ?? "0") !== "0")) {
    throw new Error(
      `5paisa MarketFeed error: ${data?.head?.statusDescription || `HTTP ${response.status}`}`
    );
  }

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
        message: `Silver quote not found for ${silverRow.Name} (scrip ${silverRow.ScripCode}) — 5paisa returned no data for it. If this persists, reconnect 5paisa.`,
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
