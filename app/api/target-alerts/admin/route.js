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

export async function GET(request) {
  if (!(await verifyAdmin(request))) {
    return Response.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const snap = await adminDb.collection("targetAlerts").limit(300).get();
    const alerts = snap.docs
      .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
      .filter((alert) => alert.active === true)
      .sort((a, b) => {
        const ad = a.createdAt?.toDate?.() || a.createdAt || new Date(0);
        const bd = b.createdAt?.toDate?.() || b.createdAt || new Date(0);
        return new Date(bd).getTime() - new Date(ad).getTime();
      })
      .slice(0, 200);

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
    if (!id) return Response.json({ success: false, message: "Missing alert id" }, { status: 400 });

    await adminDb.collection("targetAlerts").doc(id).delete();
    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ success: false, message: err.message || "Unable to remove target alert" }, { status: 500 });
  }
}

