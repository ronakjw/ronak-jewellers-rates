import { cleanSymbol } from "./utils";

export function getActiveContractRow(rows, commodityName) {
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

export function getContractRowBySymbol(rows, symbol) {
  const clean = cleanSymbol(symbol);

  if (!clean) return null;

  return (
    rows.find(
      (row) => cleanSymbol(row.tradingsymbol) === clean
    ) || null
  );
}
