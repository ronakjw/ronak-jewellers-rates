import { adminDb } from "../../../lib/firebaseAdmin";

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
  const url =
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/settings/bullion`;

  const response = await fetch(url, {
    cache: "no-store",
  });

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
    manualContract:
      fields.manualContract?.stringValue || "",
    GoldManualContract:
      fields.GoldManualContract?.stringValue || "",
  };
}

async function getMcxRows() {
  const response = await fetch(
    "https://api.kite.trade/instruments/MCX",
    {
      headers: {
        "X-Kite-Version": "3",
      },
      cache: "no-store",
    }
  );

  const csv = await response.text();
  const lines = csv.trim().split("\n");
  const headers = lines[0].split(",");

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);

    return headers.reduce((obj, key, index) => {
      obj[key] = values[index];
      return obj;
    }, {});
  });
}

function getActiveContract(rows, commodityName) {
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

  return active.tradingsymbol;
}

function getBestPrices(quote) {
  return {
    buy: quote?.depth?.buy?.[0]?.price ?? quote?.last_price ?? null,
    sell: quote?.depth?.sell?.[0]?.price ?? quote?.last_price ?? null,
  };
}

export async function GET() {
  const apiKey = process.env.KITE_API_KEY;
  const kiteDoc = await adminDb.collection("system").doc("kite").get();
  const accessToken =
    kiteDoc.data()?.accessToken || process.env.KITE_ACCESS_TOKEN;

  try {
    const settings = await getSettings();
    const rows = await getMcxRows();

    const contract = settings.autoContract
      ? getActiveContract(rows, "SILVER")
      : settings.manualContract;

    if (!contract) {
      return Response.json({
        success: false,
        message: "No silver contract selected",
      });
    }

    let goldContract = String(settings.GoldManualContract || "").trim();
    let goldError = "";
    const goldMode = goldContract ? "manual" : "auto";

    if (!goldContract) {
      try {
        goldContract = getActiveContract(rows, "GOLD");
      } catch (err) {
        goldError = err.message || "No active GOLD futures contract found";
      }
    }

    const instruments = [`MCX:${contract}`];

    if (goldContract) {
      instruments.push(`MCX:${goldContract}`);
    }

    const query = instruments
      .map((instrument) => `i=${encodeURIComponent(instrument)}`)
      .join("&");

    const response = await fetch(
      `https://api.kite.trade/quote?${query}`,
      {
        headers: {
          "X-Kite-Version": "3",
          Authorization: `token ${apiKey}:${accessToken}`,
        },
        cache: "no-store",
      }
    );

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

    const silverPrices = getBestPrices(quote);
    const goldPrices = getBestPrices(goldQuote);

    if (goldContract && !goldQuote) {
      goldError = "Gold quote not found";
    }

    return Response.json({
      success: true,

      contract,
      mode: settings.autoContract ? "auto" : "manual",
      mcxBuyPrice: silverPrices.buy,
      mcxSellPrice: silverPrices.sell,
      lastPrice: quote.last_price,
      mcxOpeningRate: quote.ohlc?.open ?? null,
      mcxClosingRate: quote.ohlc?.close ?? null,

      goldContract,
      goldMode,
      goldError,
      goldMcxBuyPrice: goldPrices.buy,
      goldMcxSellPrice: goldPrices.sell,
      goldLastPrice: goldQuote?.last_price ?? null,
      goldOpeningRate: goldQuote?.ohlc?.open ?? null,
      goldClosingRate: goldQuote?.ohlc?.close ?? null,

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
