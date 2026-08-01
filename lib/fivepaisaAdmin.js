import { adminDb } from "./firebaseAdmin";

export function getFivePaisaCreds() {
  return {
    apiKey: process.env.FIVEPAISA_API_KEY || "",
    appSource: process.env.FIVEPAISA_APP_SOURCE || "",
    userId: process.env.FIVEPAISA_USER_ID || "",
    encryptionKey: process.env.FIVEPAISA_ENCRYPTION_KEY || "",
    password: process.env.FIVEPAISA_PASSWORD || "",
    redirectUrl: process.env.FIVEPAISA_REDIRECT_URL || "",
  };
}

export function missingFivePaisaCreds() {
  const creds = getFivePaisaCreds();
  const required = ["apiKey", "userId", "encryptionKey", "redirectUrl"];
  return required.filter((key) => !creds[key]);
}

export async function getStoredFivePaisaSession() {
  const snap = await adminDb.collection("system").doc("fivepaisa").get();
  const data = snap.data();

  if (!data?.accessToken) return null;

  const expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
  if (expiresAt && Date.now() > expiresAt.getTime()) return null;

  return {
    accessToken: data.accessToken,
    clientCode: data.clientCode || "",
  };
}

export function endOfDayIST() {
 
 const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${values.year}-${values.month}-${values.day}T23:59:00+05:30`;
}
