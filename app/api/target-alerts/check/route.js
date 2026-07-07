import { adminDb } from "../../../../lib/firebaseAdmin";
import { getMessaging } from "firebase-admin/messaging";

const LABELS = {
  silver_mcx_buy: { en: "Silver MCX Buy", hi: "Silver MCX Buy" },
  silver_mcx_sell: { en: "Silver MCX Sell", hi: "Silver MCX Sell" },
  gold_mcx_buy: { en: "Gold MCX Buy", hi: "Gold MCX Buy" },
  gold_mcx_sell: { en: "Gold MCX Sell", hi: "Gold MCX Sell" },
};

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
    ? `${label} ₹${formatPrice(alert.targetRate)} पर पहुंच गया है.`
    : `${label} has reached ₹${formatPrice(alert.targetRate)}.`;

  const response = await getMessaging().sendEachForMulticast({
    tokens,
    notification: {
      title: "Ronak Jewellers Rate Alert",
      body,
    },
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
      fcmOptions: {
        link: "/",
      },
    },
  });

  return { sentCount: response.successCount || 0, failedCount: response.failureCount || 0 };
}

export async function POST(request) {
  try {
    const body = await request.json();
    const rates = body.rates || {};
    const now = new Date();
    const activeSnap = await adminDb.collection("targetAlerts").limit(500).get();

    const triggered = [];

    for (const docSnap of activeSnap.docs) {
      const alert = { id: docSnap.id, ...docSnap.data() };
      if (alert.active !== true) continue;
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

    return Response.json({ success: true, triggeredCount: triggered.length, triggered });
  } catch (err) {
    console.error(err);
    return Response.json({ success: false, message: err.message || "Unable to check alerts" }, { status: 500 });
  }
}
