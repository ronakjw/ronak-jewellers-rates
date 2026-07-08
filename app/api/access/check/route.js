import { adminDb } from "../../../../lib/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";
import allowedUsers from "../../../../data/allowed-users.json";

function normalizeIndianMobile(value) {
  let digits = String(value || "").replace(/\D/g, "");

  if (digits.length === 14 && digits.startsWith("0091")) digits = digits.slice(4);
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length > 10) digits = digits.slice(-10);

  return digits.length === 10 ? digits : "";
}

function sanitizeDeviceId(value) {
  return String(value || "")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 90);
}

function getClientIp(request) {
  const forwardedFor = request.headers.get("x-forwarded-for") || "";
  return forwardedFor.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "";
}

function getClientCity(request) {
  try {
    const city = request.headers.get("x-vercel-ip-city") || "";
    const region = request.headers.get("x-vercel-ip-country-region") || "";
    const country = request.headers.get("x-vercel-ip-country") || "";
    return decodeURIComponent([city, region, country].filter(Boolean).join(", "));
  } catch {
    return "";
  }
}

function parseDeviceInfo(userAgent = "") {
  const ua = String(userAgent || "");
  const os = /iPhone|iPad|iPod/i.test(ua)
    ? "iOS"
    : /Android/i.test(ua)
    ? "Android"
    : /Windows/i.test(ua)
    ? "Windows"
    : /Mac OS/i.test(ua)
    ? "macOS"
    : "Unknown";

  const browser = /Edg/i.test(ua)
    ? "Edge"
    : /Chrome/i.test(ua)
    ? "Chrome"
    : /Safari/i.test(ua)
    ? "Safari"
    : /Firefox/i.test(ua)
    ? "Firefox"
    : "Browser";

  return {
    os,
    browser,
    label: `${os} \n ${browser}`,
  };
}

function buildProfile(phone, profile) {
  return {
    phone,
    name: profile?.name || "",
    firstName: profile?.firstName || profile?.name || "Guest",
    role: profile?.role || "Dealer",
  };
}

function getAllowedProfile(phone) {
  if (allowedUsers[phone]) {
    return { ...allowedUsers[phone], source: "json" };
  }
  return null;
}

async function isNumberBlocked(phone) {
  const snap = await adminDb.collection("blockedUsers").doc(phone).get();
  return Boolean(snap.exists && snap.data()?.blocked !== false);
}

async function cleanupOldLoginRecords() {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);

    const oldLogs = await adminDb
      .collection("loginLogs")
      .where("createdAt", "<", cutoff)
      .limit(50)
      .get();

    if (oldLogs.empty) return;

    const batch = adminDb.batch();
    oldLogs.docs.forEach((docSnap) => batch.delete(docSnap.ref));
    await batch.commit();
  } catch (err) {
    console.error("Unable to cleanup old login records", err);
  }
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
  city,
  userAgent,
  loginMethod,
}) {
  try {
    const now = new Date();
    const dedupeBucket = Math.floor(now.getTime() / (60 * 1000));
    const dedupeKey = `${phone || "unknown"}_${deviceId || "unknown"}_${status}_${dedupeBucket}`
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 140);

    const dedupeRef = adminDb.collection("loginLogDedupe").doc(dedupeKey);
    const dedupeSnap = await dedupeRef.get();
    if (dedupeSnap.exists) return;

    await dedupeRef.set({ createdAt: now, phone: phone || "", deviceId: deviceId || "", status });
    await cleanupOldLoginRecords();

    await adminDb.collection("loginLogs").add({
      createdAt: now,
      phone: phone || "",
      attemptedPhone: attemptedPhone || "",
      name: profile?.name || "",
      firstName: profile?.firstName || "",
      role: profile?.role || "Dealer",
      status,
      authorized,
      reason: reason || "",
      deviceId: deviceId || "",
      loginMethod: loginMethod || "manual_login",
      ip: ip || "",
      city: city || "",
      userAgent: userAgent || "",
      deviceInfo: parseDeviceInfo(userAgent),
    });
  } catch (err) {
    console.error("Unable to write access record", err);
  }
}

async function verifyFirebasePhoneToken(firebaseIdToken, phone) {
  if (!firebaseIdToken) return false;

  try {
    const decoded = await getAuth().verifyIdToken(firebaseIdToken);
    const tokenPhone = normalizeIndianMobile(decoded.phone_number);
    return tokenPhone === phone;
  } catch (err) {
    console.error("Firebase phone token verification failed", err);
    return false;
  }
}

async function checkDeviceBoundToOtherNumber({ phone, deviceId }) {
  const bindingRef = adminDb.collection("deviceBindings").doc(deviceId);
  const bindingSnap = await bindingRef.get();

  if (!bindingSnap.exists) return { allowed: true };

  const boundPhone = normalizeIndianMobile(bindingSnap.data()?.phone);

  if (boundPhone && boundPhone !== phone) {
    return {
      allowed: false,
      reason: "This device is already registered with another number.",
      boundPhone,
    };
  }

  return { allowed: true };
}

async function registerOnlyActiveDevice({ phone, deviceId, ip, city, userAgent, firstDevice = false, otpVerified = false }) {
  const now = new Date();
  const deviceInfo = parseDeviceInfo(userAgent);
  const accessDocRef = adminDb.collection("accessDevices").doc(phone);
  const devicesRef = accessDocRef.collection("devices");
  const activeDevices = await devicesRef.where("active", "==", true).get();
  const batch = adminDb.batch();

  activeDevices.forEach((docSnap) => {
    if (docSnap.id !== deviceId) {
      batch.set(
        docSnap.ref,
        {
          active: false,
          replacedAt: now,
          replacedByDeviceId: deviceId,
        },
        { merge: true }
      );
      batch.delete(adminDb.collection("deviceBindings").doc(docSnap.id));
    }
  });

  batch.set(
    devicesRef.doc(deviceId),
    {
      active: true,
      firstDevice,
      otpVerified,
      createdAt: now,
      lastSeenAt: now,
      firstIp: ip || "",
      lastIp: ip || "",
      firstCity: city || "",
      lastCity: city || "",
      firstUserAgent: userAgent || "",
      lastUserAgent: userAgent || "",
      deviceInfo,
      deviceLabel: deviceInfo.label,
    },
    { merge: true }
  );

  batch.set(
    accessDocRef,
    {
      phone,
      activeDeviceId: deviceId,
      lastSeenAt: now,
      lastIp: ip || "",
      lastCity: city || "",
      lastUserAgent: userAgent || "",
      deviceInfo,
      deviceLabel: deviceInfo.label,
    },
    { merge: true }
  );

  batch.set(
    adminDb.collection("deviceBindings").doc(deviceId),
    {
      phone,
      createdAt: now,
      lastSeenAt: now,
      lastIp: ip || "",
      lastCity: city || "",
      lastUserAgent: userAgent || "",
      deviceInfo,
      deviceLabel: deviceInfo.label,
    },
    { merge: true }
  );

  await batch.commit();
}

export async function POST(request) {
  try {
    const body = await request.json();
    const phone = normalizeIndianMobile(body.phone);
    const deviceId = sanitizeDeviceId(body.deviceId);
    const firebaseIdToken = body.firebaseIdToken || "";
    const action = String(body.action || "session_check");
    const shouldWriteLoginLog = action === "login" || action === "otp_verify";
    const userAgent = request.headers.get("user-agent") || "";
    const ip = getClientIp(request);
    const city = getClientCity(request);

    if (!phone || !deviceId) {
      if (shouldWriteLoginLog) {
        await logAccessRecord({
          phone,
          attemptedPhone: String(body.phone || ""),
          deviceId,
          status: "unauthorized",
          authorized: false,
          reason: "Invalid mobile number or device",
          ip,
          city,
          userAgent,
          loginMethod: action,
        });
      }

      return Response.json({ success: false, allowed: false, message: "Invalid mobile number or device" });
    }

    const profile = getAllowedProfile(phone);

    if (!profile) {
      if (shouldWriteLoginLog) {
        await logAccessRecord({
          phone,
          attemptedPhone: String(body.phone || ""),
          deviceId,
          status: "unauthorized",
          authorized: false,
          reason: "Number not found in whitelist",
          ip,
          city,
          userAgent,
          loginMethod: action,
        });
      }

      return Response.json({ success: true, allowed: false, message: "This number is not authorized to view live rates." });
    }

    const profilePayload = buildProfile(phone, profile);

    if (await isNumberBlocked(phone)) {
      if (shouldWriteLoginLog) {
        await logAccessRecord({
          phone,
          attemptedPhone: String(body.phone || ""),
          profile,
          deviceId,
          status: "unauthorized",
          authorized: false,
          reason: "Number blocked by admin",
          ip,
          city,
          userAgent,
          loginMethod: action,
        });
      }

      return Response.json({ success: true, allowed: false, blocked: true, message: "This number is blocked. Please contact Ronak Jewellers." });
    }

    const bindingCheck = await checkDeviceBoundToOtherNumber({ phone, deviceId });

    if (!bindingCheck.allowed) {
      if (shouldWriteLoginLog) {
        await logAccessRecord({
          phone,
          attemptedPhone: String(body.phone || ""),
          profile,
          deviceId,
          status: "unauthorized",
          authorized: false,
          reason: bindingCheck.reason,
          ip,
          city,
          userAgent,
          loginMethod: action,
        });
      }

      return Response.json({ success: true, allowed: false, message: bindingCheck.reason });
    }

    const accessDocRef = adminDb.collection("accessDevices").doc(phone);
    const devicesRef = accessDocRef.collection("devices");
    const deviceRef = devicesRef.doc(deviceId);
    const deviceSnap = await deviceRef.get();

    if (deviceSnap.exists && deviceSnap.data()?.active !== false) {
      await registerOnlyActiveDevice({
        phone,
        deviceId,
        ip,
        city,
        userAgent,
        firstDevice: Boolean(deviceSnap.data()?.firstDevice),
        otpVerified: Boolean(deviceSnap.data()?.otpVerified),
      });

      if (shouldWriteLoginLog) {
        await logAccessRecord({
          phone,
          attemptedPhone: String(body.phone || ""),
          profile,
          deviceId,
          status: "success",
          authorized: true,
          reason: "Known device access granted",
          ip,
          city,
          userAgent,
          loginMethod: action === "otp_verify" ? "otp_verify" : "known_device",
        });
      }

      return Response.json({
        success: true,
        allowed: true,
        requiresOtp: false,
        knownDevice: true,
        profile: profilePayload,
      });
    }

    const activeDevices = await devicesRef.where("active", "==", true).limit(1).get();

    if (activeDevices.empty) {
      await registerOnlyActiveDevice({
        phone,
        deviceId,
        ip,
        city,
        userAgent,
        firstDevice: true,
        otpVerified: false,
      });

      if (shouldWriteLoginLog) {
        await logAccessRecord({
          phone,
          attemptedPhone: String(body.phone || ""),
          profile,
          deviceId,
          status: "success",
          authorized: true,
          reason: "First device registered",
          ip,
          city,
          userAgent,
          loginMethod: "first_device",
        });
      }

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

    await registerOnlyActiveDevice({
      phone,
      deviceId,
      ip,
      city,
      userAgent,
      firstDevice: false,
      otpVerified: true,
    });

    await logAccessRecord({
      phone,
      attemptedPhone: String(body.phone || ""),
      profile,
      deviceId,
      status: "success",
      authorized: true,
      reason: "OTP verified. Previous device replaced.",
      ip,
      city,
      userAgent,
      loginMethod: "otp_replace_device",
    });

    return Response.json({
      success: true,
      allowed: true,
      requiresOtp: false,
      registeredNewDevice: true,
      replacedOldDevice: true,
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
