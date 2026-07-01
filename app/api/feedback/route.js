import { adminDb } from "../../../lib/firebaseAdmin";

function normalizeIndianMobile(value) {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length > 10) digits = digits.slice(-10);
  return digits.length === 10 ? digits : "";
}

async function sendEmailIfConfigured({ name, phone, message }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { sent: false, reason: "RESEND_API_KEY not configured" };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.FEEDBACK_FROM_EMAIL || "Ronak Jewellers <onboarding@resend.dev>",
      to: ["rrmctexim@gmail.com"],
      subject: "Ronak Jewellers App Feedback",
      text: `Name: ${name || "--"}\nPhone: ${phone || "--"}\n\nFeedback:\n${message}`,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { sent: false, reason: text || `Email failed: ${res.status}` };
  }

  return { sent: true };
}

export async function POST(request) {
  try {
    const body = await request.json();
    const phone = normalizeIndianMobile(body.phone);
    const name = String(body.name || "").slice(0, 120);
    const message = String(body.message || "").trim().slice(0, 1500);
    const source = String(body.source || "app").slice(0, 30);

    if (!message) {
      return Response.json({ success: false, message: "Feedback cannot be empty" }, { status: 400 });
    }

    const emailResult = await sendEmailIfConfigured({ name, phone, message });

    await adminDb.collection("feedback").add({
      createdAt: new Date(),
      phone,
      name,
      message,
      source,
      emailSent: Boolean(emailResult.sent),
      emailStatus: emailResult.reason || "sent",
    });

    return Response.json({ success: true, emailSent: Boolean(emailResult.sent) });
  } catch (err) {
    return Response.json({ success: false, message: err.message || "Unable to submit feedback" }, { status: 500 });
  }
}
