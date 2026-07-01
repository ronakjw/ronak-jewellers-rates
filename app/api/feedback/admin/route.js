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
    const snap = await adminDb.collection("feedback").orderBy("createdAt", "desc").limit(100).get();
    return Response.json({ success: true, feedback: snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })) });
  } catch (err) {
    return Response.json({ success: false, message: err.message || "Unable to load feedback" }, { status: 500 });
  }
}

