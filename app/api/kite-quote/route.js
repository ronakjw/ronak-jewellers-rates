import { adminDb } from "../../../lib/firebaseAdmin";

export const dynamic = "force-dynamic";

let cachedMcxRows = null;
let cachedMcxRowsAt = 0;
const MCX_ROWS_CACHE_MS = 6 * 60 * 60 * 1000;

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

async function getMcxRows() {
  const now = Date.now();

  if (cachedMcxRows && now - cachedMcxRowsAt < MCX_ROWS_CACHE_MS) {
    return cachedMcxRows;
  }

  const response = await fetch("https://api.kite.trade/instruments/MCX", {
    headers: {
      "X-Kite-Version": "3",
    },
    cache: "no-store",
  });

  const csv = await response.text();
  const lines = csv.trim().split("\n");
  const headers = lines[0].split(",");

  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);

    return headers.reduce((obj, key, index) => {
      obj[key] = values[index];
      return obj;
    }, {});
  });

  cachedMcxRows = rows;
  cachedMcxRowsAt = now;

  return rows;
}

function getActiveContractRow(rows, commodityName) {
  const today = new Date();

  const futures = rows
    .filter((row) => {
      return (
        row.exchange === "MCX" &&
        row.segment === "MCX-FUT" &&
        row.name === commodityName &&
        row.instrument_type === "FUT" &&
        row.expiry &&
        new Date(row.expiry) >= today
      );
    })
    .sort((a, b) => new Date(a.expiry) - new Date(b.expiry));

  const active = futures[0];

  if (!active) {
    throw new Error(`No active ${commodityName} futures contract found`);
  }

  return active;
}

function getContractRowBySymbol(rows, symbol) {
  const clean = cleanSymbol(symbol);
  if (!clean) return null;

  return rows.find((row) => cleanSymbol(row.tradingsymbol) === clean) || null;
}

function getBestPrices(quote) {
  return {
    buy: quote?.depth?.buy?.[0]?.price ?? quote?.last_price ?? null,
    sell: quote?.depth?.sell?.[0]?.price ?? quote?.last_price ?? null,
  };
}

function getIndiaDateString(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

async function getLatestHistoricalClose(instrumentToken, apiKey, accessToken) {
  if (!instrumentToken) return null;

  const toDate = getIndiaDateString(new Date());
  const fromDate = getIndiaDateString(
    new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
  );

  const response = await fetch(
    `https://api.kite.trade/instruments/historical/${instrumentToken}/day?from=${fromDate}&to=${toDate}`,
    {
      headers: {
        "X-Kite-Version": "3",
        Authorization: `token ${apiKey}:${accessToken}`,
      },
      cache: "no-store",
    }
  );

  const data = await response.json();
  const candles = data?.data?.candles || [];
  const latestCandle = candles[candles.length - 1];

  return latestCandle?.[4] ?? null;
}

export async function GET() {
  const apiKey = process.env.KITE_API_KEY;

  try {
    const kiteDoc = await adminDb.collection("system").doc("kite").get();
    const accessToken =
      kiteDoc.data()?.accessToken || process.env.KITE_ACCESS_TOKEN;

    if (!apiKey || !accessToken) {
      return Response.json({
        success: false,
        message: "Kite API key or access token missing",
      });
    }

    const settings = await getSettings();
    const rows = await getMcxRows();

    const silverRow = settings.autoContract
      ? getActiveContractRow(rows, "SILVER")
      : getContractRowBySymbol(rows, settings.manualContract);

    const contract = silverRow?.tradingsymbol || settings.manualContract;

    if (!contract) {
      return Response.json({
        success: false,
        message: "No silver contract selected",
      });
    }

    let goldRow = null;
    let goldContract = "";
    let goldError = "";
    const goldMode = settings.goldManualContract ? "manual" : "auto";

    try {
      goldRow = settings.goldManualContract
        ? getContractRowBySymbol(rows, settings.goldManualContract)
        : getActiveContractRow(rows, "GOLD");

      goldContract = goldRow?.tradingsymbol || settings.goldManualContract;
    } catch (err) {
      goldError = err.message || "No active GOLD futures contract found";
    }

    const instruments = [`MCX:${contract}`];

    if (goldContract) {
      instruments.push(`MCX:${goldContract}`);
    }

    const query = instruments
      .map((instrument) => `i=${encodeURIComponent(instrument)}`)
      .join("&");

    const response = await fetch(`https://api.kite.trade/quote?${query}`, {
      headers: {
        "X-Kite-Version": "3",
        Authorization: `token ${apiKey}:${accessToken}`,
      },
      cache: "no-store",
    });

    const data = await response.json();

    const silverInstrument = `MCX:${contract}`;
    const goldInstrument = goldContract ? `MCX:${goldContract}` : "";

    const quote = data?.data?.[silverInstrument];
    const goldQuote = goldInstrument ? data?.data?.[goldInstrument] : null;

    if (!quote) {
      return Response.json({
        success: false,
        contract,
        message: "Silver quote not found",
        raw: data,
      });
    }

    if (goldContract && !goldQuote) {
      goldError = "Gold quote not found";
    }

    const silverPrices = getBestPrices(quote);
    const goldPrices = getBestPrices(goldQuote);

    let silverHistoricalClose = null;
    let goldHistoricalClose = null;

    // Important: only use the historical candle close during holiday mode.
    // This prevents Saturday/Sunday/holiday screens from showing stale quote.ohlc.close
    // values such as Thursday instead of the latest completed trading day, usually Friday.
    if (settings.holidayMode) {
      const [silverClose, goldClose] = await Promise.all([
        getLatestHistoricalClose(
          silverRow?.instrument_token,
          apiKey,
          accessToken
        ),
        goldRow?.instrument_token
          ? getLatestHistoricalClose(goldRow.instrument_token, apiKey, accessToken)
          : Promise.resolve(null),
      ]);

      silverHistoricalClose = silverClose;
      goldHistoricalClose = goldClose;
    }

    return Response.json({
      success: true,

      contract,
      mode: settings.autoContract ? "auto" : "manual",
      mcxBuyPrice: silverPrices.buy,
      mcxSellPrice: silverPrices.sell,
      lastPrice: quote.last_price,
      mcxOpeningRate: quote.ohlc?.open ?? null,
      mcxClosingRate: silverHistoricalClose ?? quote.ohlc?.close ?? null,
      silverClosingSource: silverHistoricalClose
        ? "historical_day_latest"
        : "quote_ohlc",

      goldContract,
      goldMode,
      goldError,
      goldMcxBuyPrice: goldPrices.buy,
      goldMcxSellPrice: goldPrices.sell,
      goldLastPrice: goldQuote?.last_price ?? null,
      goldOpeningRate: goldQuote?.ohlc?.open ?? null,
      goldClosingRate: goldHistoricalClose ?? goldQuote?.ohlc?.close ?? null,
      goldClosingSource: goldHistoricalClose
        ? "historical_day_latest"
        : "quote_ohlc",

      timestamp: quote.timestamp,
      lastTradeTime: quote.last_trade_time,
    });
  } catch (err) {
    return Response.json({
      success: false,
      message: err.message || "Unable to fetch quote",
    });
  }
}
