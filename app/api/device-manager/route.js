import { adminDb } from "../../../lib/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";
import allowedUsers from "../../../data/allowed-users.json";

const ADMIN_EMAIL = "rrmctexim@gmail.com";
const SEARCH_LIMIT = 40;
const RECENT_LIMIT = 10;

function normalizeIndianMobile(value) {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length > 10) digits = digits.slice(-10);
  return digits.length === 10 ? digits : "";
}

function timestampMillis(value) {
  if (!value) return 0;
  if (value?.toDate) return value.toDate().getTime();
  if (value?._seconds) return value._seconds * 1000;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
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

function allowedUserMatches(phone, profile, search, searchDigits) {
  const haystack = `${phone} ${profile?.phone || ""} ${profile?.name || ""} ${profile?.firstName || ""} ${profile?.role || ""}`.toLowerCase();
  if (search && haystack.includes(search)) return true;
  if (searchDigits && String(phone).includes(searchDigits)) return true;
  if (searchDigits && String(profile?.phone || "").includes(searchDigits)) return true;
  return false;
}

async function loadBlockedMap() {
  const blockedSnap = await adminDb.collection("blockedUsers").get();
  const blockedMap = new Map();

  blockedSnap.docs.forEach((docSnap) => {
    if (docSnap.data()?.blocked !== false) blockedMap.set(docSnap.id, docSnap.data());
  });

  return blockedMap;
}

async function getRecentAccessDocs() {
  try {
    const snap = await adminDb
      .collection("accessDevices")
      .orderBy("lastSeenAt", "desc")
      .limit(RECENT_LIMIT)
      .get();

    return snap.docs;
  } catch {
    const snap = await adminDb.collection("accessDevices").limit(RECENT_LIMIT).get();
    return snap.docs.sort(
      (a, b) => timestampMillis(b.data()?.lastSeenAt) - timestampMillis(a.data()?.lastSeenAt)
    );
  }
}

async function getAccessDocMap(phones, preloadedDocs = []) {
  const accessDocMap = new Map();

  preloadedDocs.forEach((docSnap) => {
    accessDocMap.set(docSnap.id, docSnap);
  });

  const missingPhones = phones.filter((phone) => !accessDocMap.has(phone));
  const missingDocs = await Promise.all(
    missingPhones.map(async (phone) => {
      const snap = await adminDb.collection("accessDevices").doc(phone).get();
      return [phone, snap];
    })
  );

  missingDocs.forEach(([phone, snap]) => {
    accessDocMap.set(phone, snap);
  });

  return accessDocMap;
}

async function buildRows(phones, blockedMap, preloadedDocs = []) {
  const cleanPhones = [...new Set(phones.map(normalizeIndianMobile).filter(Boolean))];
  const accessDocMap = await getAccessDocMap(cleanPhones, preloadedDocs);

  const rows = await Promise.all(
    cleanPhones.map(async (phone) => {
      const profile = profileFor(phone);
      const accessDoc = accessDocMap.get(phone);
      const accessData = accessDoc?.exists ? accessDoc.data() : {};
      const devicesSnap = await adminDb
        .collection("accessDevices")
        .doc(phone)
        .collection("devices")
        .get();
      const devices = devicesSnap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
      const activeDevice = devices.find((item) => item.active !== false) || null;
      const blocked = blockedMap.has(phone);

      return {
        ...profile,
        activeDeviceId: accessData.activeDeviceId || activeDevice?.id || "",
        registeredDevice:
          activeDevice?.deviceLabel ||
          activeDevice?.deviceInfo?.label ||
          accessData.deviceLabel ||
          "--",
        lastLoginTime: accessData.lastSeenAt || activeDevice?.lastSeenAt || null,
        lastIp: accessData.lastIp || activeDevice?.lastIp || "",
        lastCity: accessData.lastCity || activeDevice?.lastCity || "",
        blocked,
        blockedAt: blockedMap.get(phone)?.blockedAt || null,
        devices,
      };
    })
  );

  rows.sort((a, b) => {
    const timeDiff = timestampMillis(b.lastLoginTime) - timestampMillis(a.lastLoginTime);
    return timeDiff || String(a.name || a.phone).localeCompare(String(b.name || b.phone));
  });

  return rows;
}

function searchAllowedUsers(search, searchDigits) {
  const matches = [];

  for (const [phone, profile] of Object.entries(allowedUsers)) {
    const normalizedPhone = normalizeIndianMobile(phone || profile?.phone);
    if (!normalizedPhone) continue;
    if (allowedUserMatches(normalizedPhone, profile, search, searchDigits)) {
      matches.push(normalizedPhone);
    }
    if (matches.length >= SEARCH_LIMIT) break;
  }

  return matches;
}

export async function GET(request) {
  if (!(await verifyAdmin(request))) {
    return Response.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const searchParams = new URL(request.url).searchParams;
    const search = String(searchParams.get("search") || "").toLowerCase().trim();
    const searchDigits = normalizeIndianMobile(search) || String(search || "").replace(/\D/g, "");
    const blockedMap = await loadBlockedMap();

    if (!search) {
      const recentDocs = await getRecentAccessDocs();
      const phones = recentDocs.map((docSnap) => docSnap.id).filter(Boolean);
      const rows = await buildRows(phones, blockedMap, recentDocs);
      return Response.json({ success: true, devices: rows.slice(0, RECENT_LIMIT) });
    }

    const phones = new Set(searchAllowedUsers(search, searchDigits));

    const accessSnap = await adminDb.collection("accessDevices").get();
    accessSnap.docs.forEach((docSnap) => {
      const data = docSnap.data() || {};
      const haystack = `${docSnap.id} ${data.deviceLabel || ""} ${data.lastCity || ""} ${data.lastIp || ""}`.toLowerCase();
      if (haystack.includes(search) || (searchDigits && docSnap.id.includes(searchDigits))) {
        phones.add(docSnap.id);
      }
    });

    blockedMap.forEach((value, phone) => {
      const haystack = `${phone} ${value?.name || ""}`.toLowerCase();
      if (haystack.includes(search) || (searchDigits && phone.includes(searchDigits))) {
        phones.add(phone);
      }
    });

    const limitedPhones = [...phones].slice(0, SEARCH_LIMIT);
    const rows = await buildRows(limitedPhones, blockedMap, accessSnap.docs);

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

