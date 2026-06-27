import { adminDb } from "../../../lib/firebaseAdmin";

export async function POST(request) {
  try {
    const body = await request.json();

    const nowMs = Date.now();
    const cooldownMs = 10 * 60 * 1000;

    const stateRef = adminDb.collection("system").doc("volatility");
    const stateSnap = await stateRef.get();

    const lastLoggedAt =
      stateSnap.data()?.lastLoggedAt?.toDate?.()?.getTime?.() || 0;

    if (nowMs - lastLoggedAt < cooldownMs) {
      return Response.json({
        success: true,
        skipped: true,
        message: "Volatility already logged recently",
      });
    }

    const logData = {
      createdAt: new Date(),
      updatedBy: "website",
      eventType: "volatility",
      message: "Volatility triggered",

      product: "Silver",
      priceType: "MCX Buy",
      contract: String(body.contract || ""),
      currentPrice: Number(body.currentPrice || 0),
      highest: Number(body.highest || 0),
      lowest: Number(body.lowest || 0),
      movement: Number(body.movement || 0),
      triggerAmount: 550,
      windowSeconds: 40,
    };

    await adminDb.collection("changeLogs").add(logData);

    await stateRef.set(
      {
        lastLoggedAt: new Date(),
        lastMovement: logData.movement,
        lastCurrentPrice: logData.currentPrice,
        lastContract: logData.contract,
      },
      { merge: true }
    );

    return Response.json({
      success: true,
      logged: true,
    });
  } catch (err) {
    return Response.json({
      success: false,
      message: err.message || "Unable to log volatility",
    });
  }
}

