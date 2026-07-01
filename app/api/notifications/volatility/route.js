import { adminDb } from "../../../../lib/firebaseAdmin";
import { getMessaging } from "firebase-admin/messaging";

const DEFAULT_MESSAGES = {
  en: "High volatility detected in Silver rates. Please confirm rates before booking.",
  hi: "Silver rates में तेज़ उतार-चढ़ाव है. Booking से पहले rate confirm करें.",
};

async function getNotificationSettings() {
  const snap = await adminDb.collection("settings").doc("notifications").get();
  const data = snap.exists ? snap.data() : {};
  return {
    volatilityEnabled: data?.volatilityEnabled !== false,
    cooldownMinutes: Math.max(1, Number(data?.volatilityCooldownMinutes || 10)),
    volatilityMessageEn: String(data?.volatilityMessageEn || DEFAULT_MESSAGES.en),
    volatilityMessageHi: String(data?.volatilityMessageHi || DEFAULT_MESSAGES.hi),
  };
}

async function sendToLanguage(tokens, language, payloadData) {
  if (!tokens.length) return { successCount: 0, failureCount: 0 };

  const body = language === "hi" ? payloadData.messageHi : payloadData.messageEn;

  const response = await getMessaging().sendEachForMulticast({
    tokens,
    notification: {
      title: "Ronak Jewellers",
      body,
    },
    data: {
      type: "volatility",
      language,
      movement: String(payloadData.movement || ""),
      click_action: "/",
    },
    webpush: {
      notification: {
        title: "Ronak Jewellers",
        body,
        icon: "/logo.png",
        badge: "/logo.png",
      },
      fcmOptions: {
        link: "/",
      },
    },
  });

  return response;
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const settings = await getNotificationSettings();

    if (!settings.volatilityEnabled) {
      return Response.json({ success: true, skipped: true, reason: "disabled" });
    }

    const systemRef = adminDb.collection("system").doc("volatilityNotification");
    const systemSnap = await systemRef.get();
    const now = new Date();
    const lastSentAt = systemSnap.data()?.lastSentAt?.toDate?.() || null;
    const cooldownMs = settings.cooldownMinutes * 60 * 1000;

    if (lastSentAt && now.getTime() - lastSentAt.getTime() < cooldownMs) {
      return Response.json({ success: true, skipped: true, reason: "cooldown" });
    }

    const tokensSnap = await adminDb
      .collection("userPushTokens")
      .where("active", "==", true)
      .limit(500)
      .get();

    const tokensHi = [];
    const tokensEn = [];

    tokensSnap.docs.forEach((docSnap) => {
      const data = docSnap.data();
      if (!data.token) return;
      if (data.language === "hi") tokensHi.push(data.token);
      else tokensEn.push(data.token);
    });

    const payloadData = {
      messageEn: settings.volatilityMessageEn,
      messageHi: settings.volatilityMessageHi,
      movement: body.movement,
    };

    const [enResult, hiResult] = await Promise.all([
      sendToLanguage(tokensEn, "en", payloadData),
      sendToLanguage(tokensHi, "hi", payloadData),
    ]);

    await systemRef.set(
      {
        lastSentAt: now,
        lastMovement: Number(body.movement || 0),
        lastContract: body.contract || "",
        sentCount: (enResult.successCount || 0) + (hiResult.successCount || 0),
      },
      { merge: true }
    );

    await adminDb.collection("notificationLogs").add({
      createdAt: now,
      type: "volatility",
      movement: Number(body.movement || 0),
      contract: body.contract || "",
      sentCount: (enResult.successCount || 0) + (hiResult.successCount || 0),
      failedCount: (enResult.failureCount || 0) + (hiResult.failureCount || 0),
    });

    return Response.json({
      success: true,
      sentCount: (enResult.successCount || 0) + (hiResult.successCount || 0),
      failedCount: (enResult.failureCount || 0) + (hiResult.failureCount || 0),
    });
  } catch (err) {
    console.error(err);
    return Response.json({ success: false, message: err.message || "Unable to send volatility notification" }, { status: 500 });
  }
}

