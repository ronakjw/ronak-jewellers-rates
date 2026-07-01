import { adminDb } from "../../../../lib/firebaseAdmin";
import allowedUsers from "../../../../data/allowed-users.json";

function normalizeIndianMobile(value) {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length > 10) digits = digits.slice(-10);
  return digits.length === 10 ? digits : "";
}

function sanitizeDeviceId(value) {
  return String(value || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 90);
}

function sanitizeToken(value) {
  return String(value || "").replace(/[^a-zA-Z0-9_:\-.]/g, "").slice(0, 260);
}

export async function POST(request) {
  try {
    const body = await request.json();
    const phone = normalizeIndianMobile(body.phone);
    const deviceId = sanitizeDeviceId(body.deviceId);
    const token = sanitizeToken(body.token);
    const language = body.language === "hi" ? "hi" : "en";

    if (!phone || !deviceId || !token || !allowedUsers[phone]) {
      return Response.json({ success: false, message: "Invalid push token request" }, { status: 400 });
    }

    await adminDb.collection("userPushTokens").doc(token).set({
      token,
      phone,
      deviceId,
      language,
      active: true,
      updatedAt: new Date(),
      createdAt: new Date(),
    }, { merge: true });

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ success: false, message: err.message || "Unable to register notification token" }, { status: 500 });
  }
}

