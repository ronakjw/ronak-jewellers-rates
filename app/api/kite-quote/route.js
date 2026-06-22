import { adminDb } from "../../../lib/firebaseAdmin";

let cachedMcxRows = null;
let cachedMcxRowsAt = 0;

const MCX_ROWS_CACHE_MS = 6 * 60 * 60 * 1000; // 6 hours

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

async function getSettings() {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/settings/bullion`;

  const response = await fetch(url, { cache: "no-store" });
  const data = await response.json();
  const fields = data.fields || {};
  const contractMode = fields.contractMode?.stringValue;

  return {
    autoContract:
      contractMode === "auto"
        ? true
        : contractMode === "manual"
        ? false
        : fields.autoContract?.booleanValue ?? true,
    manualContract: fields.manualContract?.stringValue || "",
    GoldManualContract: fields.GoldManualContract?.stringValue || "",
  };
}
async function getMcxRows() {
  const now = Date.now();

  if (
    cachedMcxRows &&
    cachedMcxRowsAt &&
    now - cachedMcxRowsAt < MCX_ROWS_CACHE_MS
  ) {
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
  if (!symbol) return null;

  return (
    rows.find(
      (row) =>
        row.exchange === "MCX" &&
        row.segment === "MCX-FUT" &&
        row.instrument_type === "FUT" &&
        row.tradingsymbol === symbol
    ) || null
  );
}

function getBestPrices(quote) {
  return {
    buy: quote?.depth?.buy?.[0]?.price || quote?.last_price || null,
    sell: quote?.depth?.sell?.[0]?.price || quote?.last_price || null,
  };
}

async function getLatestHistoricalClose(instrumentToken, apiKey, accessToken) {
  if (!instrumentToken) return null;

  const to = new Date();
  const from = new Date();

  // Covers weekends and exchange holidays
  from.setDate(to.getDate() - 10);

  const fromDate = from.toISOString().slice(0, 10);
  const toDate = to.toISOString().slice(0, 10);

  const url =
    `https://api.kite.trade/instruments/historical/${instrumentToken}/day` +
    `?from=${fromDate}&to=${toDate}&oi=1`;

  const response = await fetch(url, {
    headers: {
      "X-Kite-Version": "3",
      Authorization: `token ${apiKey}:${accessToken}`,
    },
    cache: "no-store",
  });

  const data = await response.json();
  const candles = data?.data?.candles || [];

  if (!candles.length) return null;

  const latestCandle = candles[candles.length - 1];

  // [timestamp, open, high, low, close, volume, oi]
  return latestCandle[4] ?? null;
}

function formatDateTime(value) {
  if (!value) return null;

  try {
    return new Date(value).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour12: false,
    });
  } catch {
    return value;
  }
}

export async function GET() {
  const apiKey = process.env.KITE_API_KEY;
  const kiteDoc = await adminDb.collection("system").doc("kite").get();
  const accessToken =
    kiteDoc.data()?.accessToken || process.env.KITE_ACCESS_TOKEN;

  try {
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
      : getContractRowBySymbol(
          rows,
          String(settings.manualContract || "").trim().toUpperCase()
        );

    const contract = silverRow?.tradingsymbol;

    if (!contract) {
      return Response.json({
        success: false,
        message: "No valid silver contract selected",
      });
    }

    const goldManualContract = String(settings.GoldManualContract || "")
      .trim()
      .toUpperCase();

    let goldRow = null;
    let goldError = "";
    const goldMode = goldManualContract ? "manual" : "auto";

    try {
      goldRow = goldManualContract
        ? getContractRowBySymbol(rows, goldManualContract)
        : getActiveContractRow(rows, "GOLD");

      if (!goldRow) {
        goldError = goldManualContract
          ? `Manual gold contract not found: ${goldManualContract}`
          : "No active GOLD futures contract found";
      }
    } catch (err) {
      goldError = err.message || "Gold contract error";
    }

    const goldContract = goldRow?.tradingsymbol || "";

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

    const silverHistoricalClose = null;
    const goldHistoricalClose = null;
    
    const silverPrices = getBestPrices(quote);
    const goldPrices = getBestPrices(goldQuote);

    return Response.json({
      success: true,

      contract,
      mode: settings.autoContract ? "auto" : "manual",
      mcxBuyPrice: silverPrices.buy,
      mcxSellPrice: silverPrices.sell,
      lastPrice: quote.last_price,
      mcxOpeningRate: quote.ohlc?.open ?? null,
      mcxClosingRate: silverHistoricalClose ?? quote.ohlc?.close ?? null,

      goldContract,
      goldMode,
      goldError,
      goldMcxBuyPrice: goldPrices.buy,
      goldMcxSellPrice: goldPrices.sell,
      goldLastPrice: goldQuote?.last_price ?? null,
      goldOpeningRate: goldQuote?.ohlc?.open ?? null,
      goldClosingRate: goldHistoricalClose ?? goldQuote?.ohlc?.close ?? null,

      timestamp: formatDateTime(quote.timestamp) || quote.timestamp,
      lastTradeTime:
        formatDateTime(quote.last_trade_time) || quote.last_trade_time,

      closingSource: {
        silver: silverHistoricalClose ? "historical_day_candle" : "quote_ohlc",
        gold: goldHistoricalClose ? "historical_day_candle" : "quote_ohlc",
      },
    });
  } catch (err) {
    return Response.json({
      success: false,
      message: err.message || "Unable to fetch quote",
    });
  }
}
