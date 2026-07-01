import { adminDb } from "../../../../lib/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";

const ADMIN_EMAIL = "rrmctexim@gmail.com";

async function verifyAdmin(request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return false;
  try {
    const decoded = await getAuth().verifyIdToken(token);
    return decoded.email === ADMIN_EMAIL;
  } catch {
    return false;
  }
}

const defaults = {
  volatilityEnabled: true,
  volatilityCooldownMinutes: 10,
  volatilityMessageEn: "High volatility detected in Silver rates. Please confirm rates before booking.",
  volatilityMessageHi: "Silver rates में तेज़ उतार-चढ़ाव है. Booking से पहले rate confirm करें.",
};

export async function GET(request) {
  if (!(await verifyAdmin(request))) {
    return Response.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const snap = await adminDb.collection("settings").doc("notifications").get();
  return Response.json({ success: true, settings: { ...defaults, ...(snap.exists ? snap.data() : {}) } });
}

export async function POST(request) {
  if (!(await verifyAdmin(request))) {
    return Response.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const payload = {
    volatilityEnabled: Boolean(body.volatilityEnabled),
    volatilityCooldownMinutes: Math.max(1, Number(body.volatilityCooldownMinutes || 10)),
    volatilityMessageEn: String(body.volatilityMessageEn || defaults.volatilityMessageEn).trim(),
    volatilityMessageHi: String(body.volatilityMessageHi || defaults.volatilityMessageHi).trim(),
    updatedAt: new Date(),
  };

  await adminDb.collection("settings").doc("notifications").set(payload, { merge: true });
  return Response.json({ success: true, settings: payload });
}

