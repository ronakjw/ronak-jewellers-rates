import { adminDb } from "../../../../lib/firebaseAdmin";
import allowedUsers from "../../../../data/allowed-users.json";

function normalizeIndianMobile(value) {
  let digits = String(value || "").replace(/\D/g, "");

  if (digits.length === 14 && digits.startsWith("0091")) {
    digits = digits.slice(4);
  }

  if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2);
  }

  if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
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
    const profile = allowedUsers[phone];

    if (!phone || !profile) {
      return Response.json({
        success: false,
        message: "User not allowed",
      });
    }

    await adminDb.collection("loginLogs").add({
      createdAt: new Date(),
      phone,
      name: profile.name || "",
      firstName: profile.firstName || "",
      role: profile.role || "Dealer",
      userAgent: request.headers.get("user-agent") || "",
    });

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

