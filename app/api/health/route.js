import { adminDb } from "../../../lib/firebaseAdmin";

export async function GET() {
  try {
    const [quoteRes, kiteDoc, fivepaisaDoc, settingsDoc] = await Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/quote`, { cache: "no-store" }),
      adminDb.collection("system").doc("kite").get(),
      adminDb.collection("system").doc("fivepaisa").get(),
      adminDb.collection("settings").doc("bullion").get(),
    ]);

    const data = await quoteRes.json();

    const fivepaisaExpiresAt = fivepaisaDoc.data()?.expiresAt;
    const fivepaisaConnected = Boolean(
      fivepaisaDoc.data()?.accessToken &&
        (!fivepaisaExpiresAt || new Date(fivepaisaExpiresAt).getTime() > Date.now())
    );

    return Response.json({
      website: "online",
      kite: Boolean(kiteDoc.data()?.accessToken),
      fivepaisa: fivepaisaConnected,
      rateProvider: String(settingsDoc.data()?.rateProvider || "kite").toLowerCase(),
      activeProvider: data.activeProvider || null,
      quoteOk: Boolean(data.success),
      contract: data.contract || null,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return Response.json({
      website: "online",
      kite: false,
      fivepaisa: false,
      error: err.message,
    });
  }
}
