import { adminDb } from "../../../../lib/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";
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

function sanitizeDeviceId(value) {
  return String(value || "")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 90);
}

function getClientIp(request) {
  const forwardedFor = request.headers.get("x-forwarded-for") || "";
  return (
    forwardedFor.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    ""
  );
}

function buildProfile(phone, profile) {
  return {
    phone,
    name: profile.name || "",
    firstName: profile.firstName || profile.name || "Guest",
    role: profile.role || "Dealer",
  };
}

async function logAccessRecord({
  phone,
  attemptedPhone,
  profile,
  deviceId,
  status,
  authorized,
  reason,
  ip,
  userAgent,
}) {
  try {
    await adminDb.collection("loginLogs").add({
      createdAt: new Date(),
      phone: phone || "",
      attemptedPhone: attemptedPhone || "",
      name: profile?.name || "",
      firstName: profile?.firstName || "",
      role: profile?.role || "Dealer",
      status,
      authorized,
      reason: reason || "",
      deviceId: deviceId || "",
      loginMethod: "access_check",
      ip: ip || "",
      userAgent: userAgent || "",
    });
  } catch (err) {
    console.error("Unable to write access record", err);
  }
}

async function verifyFirebasePhoneToken(firebaseIdToken, phone) {
  if (!firebaseIdToken) {
    return false;
  }

  try {
    const decoded = await getAuth().verifyIdToken(firebaseIdToken);
    const tokenPhone = normalizeIndianMobile(decoded.phone_number);
    return tokenPhone === phone;
  } catch (err) {
    console.error("Firebase phone token verification failed", err);
    return false;
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const phone = normalizeIndianMobile(body.phone);
    const deviceId = sanitizeDeviceId(body.deviceId);
    const firebaseIdToken = body.firebaseIdToken || "";
    const profile = allowedUsers[phone];
    const now = new Date();
    const userAgent = request.headers.get("user-agent") || "";
    const ip = getClientIp(request);

    if (!phone || !deviceId) {
      await logAccessRecord({
        phone,
        attemptedPhone: String(body.phone || ""),
        deviceId,
        status: "unauthorized",
        authorized: false,
        reason: "Invalid mobile number or device",
        ip,
        userAgent,
      });

      return Response.json({
        success: false,
        allowed: false,
        message: "Invalid mobile number or device",
      });
    }

    if (!profile) {
      await logAccessRecord({
        phone,
        attemptedPhone: String(body.phone || ""),
        deviceId,
        status: "unauthorized",
        authorized: false,
        reason: "Number not found in whitelist",
        ip,
        userAgent,
      });

      return Response.json({
        success: true,
        allowed: false,
      });
    }

    const profilePayload = buildProfile(phone, profile);
    const devicesRef = adminDb
      .collection("accessDevices")
      .doc(phone)
      .collection("devices");
    const deviceRef = devicesRef.doc(deviceId);
    const deviceSnap = await deviceRef.get();

    if (deviceSnap.exists && deviceSnap.data()?.active !== false) {
      await deviceRef.set(
        {
          lastSeenAt: now,
          lastIp: ip,
          lastUserAgent: userAgent,
        },
        { merge: true }
      );

      return Response.json({
        success: true,
        allowed: true,
        requiresOtp: false,
        knownDevice: true,
        profile: profilePayload,
      });
    }

    const existingDevices = await devicesRef.limit(1).get();

    if (existingDevices.empty) {
      await deviceRef.set({
        active: true,
        firstDevice: true,
        otpVerified: false,
        createdAt: now,
        lastSeenAt: now,
        firstIp: ip,
        lastIp: ip,
        firstUserAgent: userAgent,
        lastUserAgent: userAgent,
      });

      return Response.json({
        success: true,
        allowed: true,
        requiresOtp: false,
        registeredNewDevice: true,
        profile: profilePayload,
      });
    }

    const tokenVerified = await verifyFirebasePhoneToken(firebaseIdToken, phone);

    if (!tokenVerified) {
      return Response.json({
        success: true,
        allowed: true,
        requiresOtp: true,
        message: "OTP required for new device",
        profile: profilePayload,
      });
    }

    await deviceRef.set({
      active: true,
      firstDevice: false,
      otpVerified: true,
      createdAt: now,
      lastSeenAt: now,
      firstIp: ip,
      lastIp: ip,
      firstUserAgent: userAgent,
      lastUserAgent: userAgent,
    });

    return Response.json({
      success: true,
      allowed: true,
      requiresOtp: false,
      registeredNewDevice: true,
      otpVerified: true,
      profile: profilePayload,
    });
  } catch (err) {
    console.error(err);
    return Response.json({
      success: false,
      allowed: false,
      message: err.message || "Unable to check access",
    });
  }
}
