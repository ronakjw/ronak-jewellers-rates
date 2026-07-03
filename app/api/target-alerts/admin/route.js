import { adminDb } from "../../../../lib/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";

const ADMIN_EMAIL = "rrmctexim@gmail.com";

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

function timestampMillis(value) {
  if (!value) return 0;
  if (value?.toDate) return value.toDate().getTime();
  if (value?._seconds) return value._seconds * 1000;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

async function loadActiveAlerts() {
  try {
    const snap = await adminDb
      .collection("targetAlerts")
      .where("active", "==", true)
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();

    return snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  } catch {
    const snap = await adminDb
      .collection("targetAlerts")
      .where("active", "==", true)
      .limit(100)
      .get();

    return snap.docs
      .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
      .sort((a, b) => timestampMillis(b.createdAt) - timestampMillis(a.createdAt));
  }
}

export async function GET(request) {
  if (!(await verifyAdmin(request))) {
    return Response.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const alerts = await loadActiveAlerts();
    return Response.json({ success: true, alerts });
  } catch (err) {
    return Response.json({ success: false, message: err.message || "Unable to load target alerts" }, { status: 500 });
  }
}

export async function DELETE(request) {
  if (!(await verifyAdmin(request))) {
    return Response.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const id = String(new URL(request.url).searchParams.get("id") || "");
    if (!id) {
      return Response.json({ success: false, message: "Missing alert id" }, { status: 400 });
    }

    await adminDb.collection("targetAlerts").doc(id).delete();
    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ success: false, message: err.message || "Unable to remove target alert" }, { status: 500 });
  }
}

