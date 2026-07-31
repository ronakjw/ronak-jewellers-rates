let cachedMcxRows = null;
let cachedMcxRowsAt = 0;

const MCX_ROWS_CACHE_MS = 6 * 60 * 60 * 1000;

export function parseCsvLine(line) {
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

export async function getMcxRows() {
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
