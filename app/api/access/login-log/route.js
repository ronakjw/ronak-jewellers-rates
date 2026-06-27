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
        message: "Invalid mobile number",
      });
    }

    const userRef = adminDb.collection("allowedUsers").doc(phone);
    const userSnap = await userRef.get();

    if (!userSnap.exists || userSnap.data()?.active === false) {
      return Response.json({
        success: false,
        message: "User not allowed",
      });
    }

    const currentCount = Number(userSnap.data()?.totalLogins || 0);

    await adminDb.collection("loginLogs").add({
      createdAt: new Date(),
      phone,
      uid: String(body.uid || ""),
      userAgent: request.headers.get("user-agent") || "",
    });

    await userRef.set(
      {
        lastLoginAt: new Date(),
        lastSeenAt: new Date(),
        totalLogins: currentCount + 1,
      },
      { merge: true }
    );

    return Response.json({
      success: true,
    });
  } catch (err) {
    return Response.json({
      success: false,
      message: err.message || "Unable to log login",
    });
  }
}

