import { adminDb } from "../../../../lib/firebaseAdmin";

function normalizeIndianMobile(value) {
  let digits = String(value || "").replace(/\D/g, "");

  if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2);
  }

  if (digits.length > 10) {
    digits = digits.slice(-10);
  }

  return digits.length === 10 ? digits : "";
}

export async function POST(request) {
  try {
    const body = await request.json();
    const phone = normalizeIndianMobile(body.phone);

    if (!phone) {
      return Response.json({
        success: false,
        allowed: false,
        message: "Invalid mobile number",
      });
    }

    const snap = await adminDb.collection("allowedUsers").doc(phone).get();

    if (!snap.exists) {
      return Response.json({
        success: true,
        allowed: false,
      });
    }

    const data = snap.data() || {};

    if (data.active === false) {
      return Response.json({
        success: true,
        allowed: false,
      });
    }

    await adminDb.collection("allowedUsers").doc(phone).set(
      {
        lastSeenAt: new Date(),
      },
      { merge: true }
    );

    return Response.json({
      success: true,
      allowed: true,
      profile: {
        phone,
        name: data.name || "",
        firm: data.firm || "",
        city: data.city || "",
        role: data.role || "Dealer",
      },
    });
  } catch (err) {
    return Response.json({
      success: false,
      allowed: false,
      message: err.message || "Unable to check access",
    });
  }
}

