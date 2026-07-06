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
    const snap = await adminDb
      .collection("accessRequests")
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();

    const requests = snap.docs
      .map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }))
      .filter((item) => item.status === "pending");

    return Response.json({ success: true, requests });
  } catch (err) {
    return Response.json(
      { success: false, message: err.message || "Unable to load new requests" },
      { status: 500 }
    );
  }
}
export async function DELETE(request) {
  if (!(await verifyAdmin(request))) {
    return Response.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const params = new URL(request.url).searchParams;
    const id = String(params.get("id") || "").trim();

    if (!id) {
      return Response.json(
        { success: false, message: "Missing request id" },
        { status: 400 }
      );
    }

    await adminDb.collection("accessRequests").doc(id).delete();

    return Response.json({
      success: true,
      message: "Request removed",
    });
  } catch (err) {
    return Response.json(
      {
        success: false,
        message: err.message || "Unable to remove request",
      },
      { status: 500 }
    );
  }
}

