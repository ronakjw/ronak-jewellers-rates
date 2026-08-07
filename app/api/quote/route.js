import { adminDb } from "../../../lib/firebaseAdmin";
import { getFivePaisaQuote } from "../5paisa/quote/route";

export const dynamic = "force-dynamic";

async function getRateProvider() {
  const snap = await adminDb.collection("settings").doc("bullion").get();
  const provider = String(snap.data()?.rateProvider || "kite").toLowerCase();
  return provider === "5paisa" ? "5paisa" : "kite";
}

// 5paisa is called in-process (function call, no network hop) since we own
// that code. Kite still goes over HTTP to its own route — kept as-is since
// it's a separate, already-working integration.
async function getQuoteFor(provider, siteUrl) {
  if (provider === "5paisa") {
    return getFivePaisaQuote();
  }

  const response = await fetch(`${siteUrl}/api/kite-quote`, { cache: "no-store" });
  return response.json();
}

export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  const provider = await getRateProvider();
  const fallbackProvider = provider === "5paisa" ? "kite" : "5paisa";

  try {
    const primary = await getQuoteFor(provider, siteUrl);

    if (primary.success) {
      return Response.json({ ...primary, activeProvider: provider });
    }

    // Primary provider failed — fall back to the other one automatically
    // so the site keeps showing live rates.
    const fallback = await getQuoteFor(fallbackProvider, siteUrl);

    return Response.json({
      ...fallback,
      activeProvider: fallbackProvider,
      primaryProviderError: primary.message || "Primary provider failed",
    });
  } catch (err) {
    return Response.json({
      success: false,
      message: err.message || "Unable to fetch quote",
    });
  }
}
