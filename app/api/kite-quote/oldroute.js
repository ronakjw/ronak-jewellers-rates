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

  return {
    autoContract:
      fields.autoContract?.booleanValue ?? true,
    manualContract:
      fields.manualContract?.stringValue || "",
  };
}

async function getActiveSilverContract() {
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

  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);

    return headers.reduce((obj, key, index) => {
      obj[key] = values[index];
      return obj;
    }, {});
  });

  const today = new Date();

  const silverFutures = rows
    .filter((row) => {
      return (
        row.exchange === "MCX" &&
        row.segment === "MCX-FUT" &&
        row.name === "SILVER" &&
        row.instrument_type === "FUT" &&
        row.expiry &&
        new Date(row.expiry) >= today
      );
    })
    .sort((a, b) => new Date(a.expiry) - new Date(b.expiry));

  const active = silverFutures[0];

  if (!active) {
    throw new Error("No active SILVER futures contract found");
  }

  return active.tradingsymbol;
}

export async function GET() {
  const apiKey = process.env.KITE_API_KEY;
  const kiteDoc = await adminDb.collection("system").doc("kite").get();
  const accessToken = kiteDoc.data()?.accessToken || process.env.KITE_ACCESS_TOKEN;

  try {
    const settings = await getSettings();

    const contract = settings.autoContract
      ? await getActiveSilverContract()
      : settings.manualContract;

    if (!contract) {
      return Response.json({
        success: false,
        message: "No contract selected",
      });
    }

    const instrument = `MCX:${contract}`;

    const response = await fetch(
      `https://api.kite.trade/quote?i=${encodeURIComponent(instrument)}`,
      {
        headers: {
          "X-Kite-Version": "3",
          Authorization: `token ${apiKey}:${accessToken}`,
        },
        cache: "no-store",
      }
    );

    const data = await response.json();
    const quote = data?.data?.[instrument];

    if (!quote) {
      return Response.json({
        success: false,
        contract,
        message: "Quote not found",
        raw: data,
      });
    }

    return Response.json({
      success: true,
      contract,
      mode: settings.autoContract ? "auto" : "manual",
      mcxBuyPrice: quote.depth?.buy?.[0]?.price ?? null,
      mcxSellPrice: quote.depth?.sell?.[0]?.price ?? null,
      lastPrice: quote.last_price,
      mcxOpeningRate: quote.ohlc?.open ?? null,
      mcxClosingRate: quote.ohlc?.close ?? null,
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
