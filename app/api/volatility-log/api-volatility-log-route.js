import { adminDb } from "../../../lib/firebaseAdmin";

export async function POST(request) {
  try {
    const body = await request.json();

    const now = new Date();
    const nowMs = now.getTime();
    const cooldownMs = 10 * 60 * 1000;
    const movement = Number(body.movement || 0);

    const stateRef = adminDb.collection("system").doc("volatility");
    const stateSnap = await stateRef.get();
    const lastLoggedAt = stateSnap.data()?.lastLoggedAt?.toDate?.()?.getTime?.() || 0;

    // Always refresh the visible warning state, even when the audit log is in cooldown.
    await stateRef.set(
      {
        active: true,
        movement,
        triggeredAt: now,
        expiresAt: new Date(nowMs + cooldownMs),
        lastMovement: movement,
        lastCurrentPrice: Number(body.currentPrice || 0),
        lastContract: String(body.contract || ""),
      },
      { merge: true }
    );

    if (nowMs - lastLoggedAt < cooldownMs) {
      return Response.json({
        success: true,
        skipped: true,
        warningUpdated: true,
        message: "Volatility warning refreshed",
      });
    }

    const logData = {
      createdAt: now,
      updatedBy: "website",
      eventType: "volatility",
      message: "Volatility triggered",
      product: "Silver",
      priceType: "MCX Buy",
      contract: String(body.contract || ""),
      currentPrice: Number(body.currentPrice || 0),
      highest: Number(body.highest || 0),
      lowest: Number(body.lowest || 0),
      movement,
      triggerAmount: 650,
      windowSeconds: 40,
    };

    await adminDb.collection("changeLogs").add(logData);
    await stateRef.set({ lastLoggedAt: now }, { merge: true });

    return Response.json({ success: true, logged: true, warningUpdated: true });
  } catch (err) {
    console.error("Volatility log failed", err);
    return Response.json(
      { success: false, message: err.message || "Unable to log volatility" },
      { status: 500 }
    );
  }
}
