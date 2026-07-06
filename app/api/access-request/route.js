import { adminDb } from "../../../lib/firebaseAdmin";

function normalizeIndianMobile(value) {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 14 && digits.startsWith("0091")) digits = digits.slice(4);
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length > 10) digits = digits.slice(-10);
  return digits.length === 10 ? digits : "";
}

function cleanText(value, maxLength = 120) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, maxLength);
}

export async function POST(request) {
  try {
    const body = await request.json();

    const name = cleanText(body.name);
    const firmName = cleanText(body.firmName);
    const phone = normalizeIndianMobile(body.phone || body.mobile);
    const city = cleanText(body.city);
    const state = cleanText(body.state);
    const email = cleanText(body.email, 160).toLowerCase();

    if (!name || !firmName || !phone || !city || !state {
      return Response.json(
        { success: false, message: "Please fill all authorization details correctly." },
        { status: 400 }
      );
    }

    const existingSnap = await adminDb
      .collection("accessRequests")
      .where("phone", "==", phone)
      .where("status", "==", "pending")
      .limit(1)
      .get();

    const payload = {
      name,
      firmName,
      phone,
      city,
      state,
      email,
      status: "pending",
      updatedAt: new Date(),
      source: "dealer_access_page",
    };

    if (!existingSnap.empty) {
      const ref = existingSnap.docs[0].ref;
      await ref.set(payload, { merge: true });
      return Response.json({ success: true, id: ref.id });
    }

    const docRef = await adminDb.collection("accessRequests").add({
      ...payload,
      createdAt: new Date(),
    });

    return Response.json({ success: true, id: docRef.id });
  } catch (err) {
    return Response.json(
      { success: false, message: err.message || "Unable to submit authorization request" },
      { status: 500 }
    );
  }
}

