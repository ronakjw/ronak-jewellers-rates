import { adminDb } from "../../../lib/firebaseAdmin";

export const dynamic = "force-dynamic";

async function getRateProvider() {
  const snap = await adminDb.collection("settings").doc("bullion").get();
  const provider = String(snap.data()?.rateProvider || "kite").toLowerCase();
  return provider === "5paisa" ? "5paisa" : "kite";
}

async function fetchInternal(path, siteUrl) {
  const response = await fetch(`${siteUrl}${path}`, { cache: "no-store" });
  return response.json();
}

export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
  const provider = await getRateProvider();

  const primaryPath = provider === "5paisa" ? "/api/5paisa/quote" : "/api/kite-quote";
  const fallbackPath = provider === "5paisa" ? "/api/kite-quote" : "/api/5paisa/quote";

  try {
    const primary = await fetchInternal(primaryPath, siteUrl);

    if (primary.success) {
      return Response.json({ ...primary, activeProvider: provider });
    }

    // Primary provider failed — fall back to the other one automatically
    // so the site keeps showing live rates.
    const fallback = await fetchInternal(fallbackPath, siteUrl);

    return Response.json({
      ...fallback,
      activeProvider: provider === "5paisa" ? "kite" : "5paisa",
      primaryProviderError: primary.message || "Primary provider failed",
    });
  } catch (err) {
    return Response.json({
      success: false,
      message: err.message || "Unable to fetch quote",
    });
  }
}
