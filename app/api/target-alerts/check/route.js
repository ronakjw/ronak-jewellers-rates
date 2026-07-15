import { adminDb } from "../../../../lib/firebaseAdmin";
import { getMessaging } from "firebase-admin/messaging";
import allowedUsers from "../../../../data/allowed-users.json";

const LABELS = {
  silver_mcx_buy: { en: "Silver MCX Buy", hi: "सिल्वर MCX खरीद" },
  silver_mcx_sell: { en: "Silver MCX Sell", hi: "सिल्वर MCX बिक्री" },
  gold_mcx_buy: { en: "Gold MCX Buy", hi: "गोल्ड MCX खरीद" },
  gold_mcx_sell: { en: "Gold MCX Sell", hi: "गोल्ड MCX बिक्री" },
};

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


async function loadActiveAlertsForPhone(phone) {
  try {
    const snap = await adminDb
      .collection("targetAlerts")
      .where("phone", "==", phone)
      .where("active", "==", true)
      .limit(10)
      .get();

    return snap.docs;
  } catch {
    const snap = await adminDb.collection("targetAlerts").limit(300).get();
    return snap.docs
      .filter((docSnap) => {
        const data = docSnap.data();
        return data.phone === phone && data.active === true;
      })
      .slice(0, 10);
  }
}

function formatPrice(value) {
  return new Intl.NumberFormat("en-IN").format(Number(value || 0));
}

function reached(current, condition, target) {
  if (!Number.isFinite(current) || !Number.isFinite(target)) return false;
  return condition === "below_equal" ? current <= target : current >= target;
}

async function sendAlertNotification(alert, currentRate) {
  const tokenSnap = await adminDb
    .collection("userPushTokens")
    .where("phone", "==", alert.phone)
    .where("active", "==", true)
    .limit(20)
    .get();

  const tokens = tokenSnap.docs.map((docSnap) => docSnap.data()?.token).filter(Boolean);
  if (!tokens.length) return { sentCount: 0, failedCount: 0 };

  const language = alert.language === "hi" ? "hi" : "en";
  const label = LABELS[alert.rateType]?.[language] || alert.rateType;
  const body = language === "hi"
    ? `${label} ₹${formatPrice(alert.targetRate)} पर पहुंच गया है।`
    : `${label} has reached ₹${formatPrice(alert.targetRate)}.`;

  const response = await getMessaging().sendEachForMulticast({
    tokens,
    notification: { title: "Ronak Jewellers Rate Alert", body },
    data: {
      type: "target_alert",
      alertId: alert.id || "",
      rateType: alert.rateType,
      currentRate: String(currentRate || ""),
      targetRate: String(alert.targetRate || ""),
      click_action: "/",
    },
    webpush: {
      notification: {
        title: "Ronak Jewellers Rate Alert",
        body,
        icon: "/logo.png",
        badge: "/logo.png",
      },
      fcmOptions: { link: "/" },
    },
  });

  return {
    sentCount: response.successCount || 0,
    failedCount: response.failureCount || 0,
  };
}

export async function POST(request) {
  try {
    const body = await request.json();
    const phone = normalizeIndianMobile(body.phone);
    const deviceId = sanitizeDeviceId(body.deviceId);
    const rates = body.rates || {};

    if (!(await verifyDevice(phone, deviceId))) {
      return Response.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Only check alerts belonging to the verified user making this request.
    const activeDocs = await loadActiveAlertsForPhone(phone);

    const now = new Date();
    const triggered = [];

    for (const docSnap of activeDocs) {
      const alert = { id: docSnap.id, ...docSnap.data() };
      const currentRate = Number(rates[alert.rateType]);

      if (!reached(currentRate, alert.condition, Number(alert.targetRate))) continue;

      const notificationResult = await sendAlertNotification(alert, currentRate);

      await adminDb.collection("notificationLogs").add({
        createdAt: now,
        type: "target_alert",
        alertId: docSnap.id,
        phone: alert.phone,
        name: alert.name || "",
        rateType: alert.rateType,
        condition: alert.condition,
        targetRate: Number(alert.targetRate),
        currentRate,
        sentCount: notificationResult.sentCount,
        failedCount: notificationResult.failedCount,
      });

      await docSnap.ref.set(
        {
          active: false,
          triggeredAt: now,
          triggeredRate: currentRate,
          updatedAt: now,
        },
        { merge: true }
      );

      triggered.push(docSnap.id);
    }

    return Response.json({
      success: true,
      triggeredCount: triggered.length,
      triggered,
    });
  } catch (err) {
    console.error(err);
    return Response.json(
      { success: false, message: err.message || "Unable to check alerts" },
      { status: 500 }
    );
  }
}
