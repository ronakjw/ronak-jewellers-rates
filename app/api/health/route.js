import { adminDb } from "../../../lib/firebaseAdmin";

export async function GET() {

  const results = await Promise.allSettled([
    fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/quote`, { cache: "no-store" }).then((r) => r.json()),
    adminDb.collection("system").doc("kite").get(),
    adminDb.collection("system").doc("fivepaisa").get(),
    adminDb.collection("settings").doc("bullion").get(),
  ]);

  const [quoteResult, kiteResult, fivepaisaResult, settingsResult] = results;

  const data = quoteResult.status === "fulfilled" ? quoteResult.value : null;
  const kiteDoc = kiteResult.status === "fulfilled" ? kiteResult.value : null;
  const fivepaisaDoc = fivepaisaResult.status === "fulfilled" ? fivepaisaResult.value : null;
  const settingsDoc = settingsResult.status === "fulfilled" ? settingsResult.value : null;

  const fivepaisaExpiresAt = fivepaisaDoc?.data()?.expiresAt;
  const fivepaisaConnected = Boolean(
    fivepaisaDoc?.data()?.accessToken &&
      (!fivepaisaExpiresAt || new Date(fivepaisaExpiresAt).getTime() > Date.now())
  );

  return Response.json({
    website: "online",
    kite: Boolean(kiteDoc?.data()?.accessToken),
    kiteCheckFailed: kiteResult.status === "rejected",
    fivepaisa: fivepaisaConnected,
    fivepaisaCheckFailed: fivepaisaResult.status === "rejected",
    rateProvider: String(settingsDoc?.data()?.rateProvider || "kite").toLowerCase(),
    activeProvider: data?.activeProvider || null,
    quoteOk: Boolean(data?.success),
    quoteCheckFailed: quoteResult.status === "rejected",
    quoteError: quoteResult.status === "rejected" ? quoteResult.reason?.message : null,
    contract: data?.contract || null,
    timestamp: new Date().toISOString(),
  });
}
