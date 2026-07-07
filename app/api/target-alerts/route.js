import { adminDb } from "../../../lib/firebaseAdmin";
import allowedUsers from "../../../data/allowed-users.json";

const RATE_TYPES = new Set([
  "silver_mcx_buy",
  "silver_mcx_sell",
  "gold_mcx_buy",
  "gold_mcx_sell",
]);
const CONDITIONS = new Set(["below_equal", "above_equal"]);

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

function timestampMillis(value) {
  if (!value) return 0;
  if (value?.toDate) return value.toDate().getTime();
  if (value?._seconds) return value._seconds * 1000;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function profileFor(phone) {
  const profile = allowedUsers[phone] || {};
  return {
    name: profile.name || "",
    firstName: profile.firstName || "",
    role: profile.role || "Dealer",
  };
}

async function verifyDevice(phone, deviceId) {
  if (!phone || !deviceId || !allowedUsers[phone]) return false;
  const snap = await adminDb
    .collection("accessDevices")
    .doc(phone)
    .collection("devices")
    .doc(deviceId)
    .get();
  return Boolean(snap.exists && snap.data()?.active !== false);
}

async function loadAlertsForPhone(phone, active, maxCount = 20) {
  try {
    const snap = await adminDb
      .collection("targetAlerts")
      .where("phone", "==", phone)
      .where("active", "==", active)
      .limit(maxCount)
      .get();

    return snap.docs
      .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
      .sort((a, b) =>
        timestampMillis(b.triggeredAt || b.updatedAt || b.createdAt) -
        timestampMillis(a.triggeredAt || a.updatedAt || a.createdAt)
      )
      .slice(0, maxCount);
  } catch {
    const snap = await adminDb.collection("targetAlerts").limit(500).get();
    return snap.docs
      .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
      .filter((alert) => alert.phone === phone && alert.active === active)
      .sort((a, b) =>
        timestampMillis(b.triggeredAt || b.updatedAt || b.createdAt) -
        timestampMillis(a.triggeredAt || a.updatedAt || a.createdAt)
      )
      .slice(0, maxCount);
  }
}

async function countActiveAlertsForPhone(phone) {
  try {
    const snap = await adminDb
      .collection("targetAlerts")
      .where("phone", "==", phone)
      .where("active", "==", true)
      .limit(5)
      .get();
    return snap.size;
  } catch {
    const snap = await adminDb.collection("targetAlerts").limit(300).get();
    return snap.docs
      .map((docSnap) => docSnap.data())
      .filter((alert) => alert.phone === phone && alert.active === true).length;
  }
}

export async function GET(request) {
  try {
    const params = new URL(request.url).searchParams;
    const phone = normalizeIndianMobile(params.get("phone"));
    const deviceId = sanitizeDeviceId(params.get("deviceId"));

    if (!(await verifyDevice(phone, deviceId))) {
      return Response.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const [activeAlerts, triggeredAlerts] = await Promise.all([
      loadAlertsForPhone(phone, true, 5),
      loadAlertsForPhone(phone, false, 20),
    ]);

    return Response.json({
      success: true,
      alerts: activeAlerts,
      activeAlerts,
      triggeredAlerts,
    });
  } catch (err) {
    return Response.json({ success: false, message: err.message || "Unable to load alerts" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const id = String(body.id || "").trim();
    const phone = normalizeIndianMobile(body.phone);
    const deviceId = sanitizeDeviceId(body.deviceId);
    const rateType = String(body.rateType || "");
    const condition = String(body.condition || "");
    const targetRate = Number(body.targetRate);
    const language = body.language === "hi" ? "hi" : "en";

    if (!(await verifyDevice(phone, deviceId))) {
      return Response.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    if (!RATE_TYPES.has(rateType) || !CONDITIONS.has(condition) || !Number.isFinite(targetRate) || targetRate <= 0) {
      return Response.json({ success: false, message: "Invalid alert details" }, { status: 400 });
    }

    if (id) {
      const ref = adminDb.collection("targetAlerts").doc(id);
      const snap = await ref.get();

      if (!snap.exists || snap.data()?.phone !== phone || snap.data()?.active !== true) {
        return Response.json({ success: false, message: "Alert not found" }, { status: 404 });
      }

      await ref.set(
        {
          rateType,
          condition,
          targetRate,
          language,
          updatedAt: new Date(),
        },
        { merge: true }
      );

      return Response.json({ success: true, id, updated: true });
    }

    const activeCount = await countActiveAlertsForPhone(phone);

    if (activeCount >= 5) {
      return Response.json({ success: false, message: "Maximum 5 active alerts allowed." }, { status: 400 });
    }

    const profile = profileFor(phone);
    const docRef = await adminDb.collection("targetAlerts").add({
      phone,
      deviceId,
      name: profile.name,
      firstName: profile.firstName,
      role: profile.role,
      rateType,
      condition,
      targetRate,
      language,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return Response.json({ success: true, id: docRef.id });
  } catch (err) {
    return Response.json({ success: false, message: err.message || "Unable to save alert" }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const params = new URL(request.url).searchParams;
    const id = String(params.get("id") || "");
    const phone = normalizeIndianMobile(params.get("phone"));
    const deviceId = sanitizeDeviceId(params.get("deviceId"));

    if (!(await verifyDevice(phone, deviceId))) {
      return Response.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const ref = adminDb.collection("targetAlerts").doc(id);
    const snap = await ref.get();

    if (!snap.exists || snap.data()?.phone !== phone) {
      return Response.json({ success: false, message: "Alert not found" }, { status: 404 });
    }

    await ref.delete();
    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ success: false, message: err.message || "Unable to remove alert" }, { status: 500 });
  }
}
