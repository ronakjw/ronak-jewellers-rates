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

export async function GET() {
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
    return Response.json({
      success: false,
      message: "No active SILVER futures contract found",
    });
  }

  return Response.json({
    success: true,
    contract: active.tradingsymbol,
    expiry: active.expiry,
    instrumentToken: active.instrument_token,
    availableContracts: silverFutures.slice(0, 8).map((item) => ({
      contract: item.tradingsymbol,
      expiry: item.expiry,
    })),
  });
}
