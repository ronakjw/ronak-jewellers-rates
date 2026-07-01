import { adminDb } from "../../../lib/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";
import allowedUsers from "../../../data/allowed-users.json";

const ADMIN_EMAIL = "rrmctexim@gmail.com";

function normalizeIndianMobile(value) {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length > 10) digits = digits.slice(-10);
  return digits.length === 10 ? digits : "";
}

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

function profileFor(phone) {
  const profile = allowedUsers[phone] || {};
  return {
    phone,
    name: profile.name || "",
    firstName: profile.firstName || "",
    role: profile.role || "Dealer",
  };
}

export async function GET(request) {
  if (!(await verifyAdmin(request))) {
    return Response.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const searchParams = new URL(request.url).searchParams;
    const search = String(searchParams.get("search") || "").toLowerCase().trim();
    const accessSnap = await adminDb.collection("accessDevices").get();
    const blockedSnap = await adminDb.collection("blockedUsers").get();
    const blockedMap = new Map();

    blockedSnap.docs.forEach((docSnap) => {
      if (docSnap.data()?.blocked !== false) blockedMap.set(docSnap.id, docSnap.data());
    });

    const phones = new Set([...accessSnap.docs.map((docSnap) => docSnap.id), ...blockedMap.keys()]);
    const rows = [];

    for (const phone of phones) {
      const profile = profileFor(phone);
      const accessDoc = accessSnap.docs.find((docSnap) => docSnap.id === phone);
      const accessData = accessDoc?.data?.() || {};
      const devicesSnap = await adminDb.collection("accessDevices").doc(phone).collection("devices").get();
      const devices = devicesSnap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
      const activeDevice = devices.find((item) => item.active !== false) || null;
      const blocked = blockedMap.has(phone);

      const row = {
        ...profile,
        activeDeviceId: accessData.activeDeviceId || activeDevice?.id || "",
        registeredDevice: activeDevice?.deviceLabel || activeDevice?.deviceInfo?.label || accessData.deviceLabel || "--",
        lastLoginTime: accessData.lastSeenAt || activeDevice?.lastSeenAt || null,
        lastIp: accessData.lastIp || activeDevice?.lastIp || "",
        lastCity: accessData.lastCity || activeDevice?.lastCity || "",
        blocked,
        blockedAt: blockedMap.get(phone)?.blockedAt || null,
        devices,
      };

      const haystack = `${row.phone} ${row.name} ${row.firstName} ${row.registeredDevice}`.toLowerCase();
      if (!search || haystack.includes(search)) rows.push(row);
    }

    rows.sort((a, b) => String(a.name || a.phone).localeCompare(String(b.name || b.phone)));

    return Response.json({ success: true, devices: rows });
  } catch (err) {
    return Response.json({ success: false, message: err.message || "Unable to load devices" }, { status: 500 });
  }
}

export async function POST(request) {
  if (!(await verifyAdmin(request))) {
    return Response.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const action = String(body.action || "");
    const phone = normalizeIndianMobile(body.phone);

    if (!phone) {
      return Response.json({ success: false, message: "Invalid phone number" }, { status: 400 });
    }

    if (action === "remove_device") {
      const accessRef = adminDb.collection("accessDevices").doc(phone);
      const devicesSnap = await accessRef.collection("devices").get();
      const batch = adminDb.batch();

      devicesSnap.docs.forEach((docSnap) => {
        batch.set(docSnap.ref, { active: false, removedByAdminAt: new Date() }, { merge: true });
        batch.delete(adminDb.collection("deviceBindings").doc(docSnap.id));
      });

      batch.set(accessRef, { activeDeviceId: "", removedByAdminAt: new Date() }, { merge: true });
      await batch.commit();

      return Response.json({ success: true, message: "Device removed" });
    }

    if (action === "block") {
      await adminDb.collection("blockedUsers").doc(phone).set({
        phone,
        blocked: true,
        blockedAt: new Date(),
      }, { merge: true });
      return Response.json({ success: true, message: "Number blocked" });
    }

    if (action === "unblock") {
      await adminDb.collection("blockedUsers").doc(phone).set({
        phone,
        blocked: false,
        unblockedAt: new Date(),
      }, { merge: true });
      return Response.json({ success: true, message: "Number unblocked" });
    }

    return Response.json({ success: false, message: "Unknown action" }, { status: 400 });
  } catch (err) {
    return Response.json({ success: false, message: err.message || "Device action failed" }, { status: 500 });
  }
}

