import * as kite from "./kite";
import * as fivepaisa from "./fivepaisa";

const provider =
  process.env.MARKET_PROVIDER?.toLowerCase() || "kite";

export function getMarketProvider() {
  switch (provider) {
    case "fivepaisa":
      return fivepaisa;

    case "kite":
    default:
      return kite;
  }
}
