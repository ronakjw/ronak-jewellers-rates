
export function toBool(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

export function cleanSymbol(value) {
  return String(value || "").trim().toUpperCase();
}

export function getBestPrices(quote) {
  return {
    buy: quote?.depth?.buy?.[0]?.price ?? quote?.last_price ?? null,
    sell: quote?.depth?.sell?.[0]?.price ?? quote?.last_price ?? null,
  };
}

export function getIndiaDateString(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );

  return `${values.year}-${values.month}-${values.day}`;
}
