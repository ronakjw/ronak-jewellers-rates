import crypto from "crypto";
import { adminDb } from "../../../../lib/firebaseAdmin";

export async function GET(req) {
  const { searchParams } = new URL(req.url);

  const requestToken = searchParams.get("request_token");

  if (!requestToken) {
    return Response.json({
      success: false,
      message: "Missing request token",
    });
  }

  const apiKey = process.env.KITE_API_KEY;
  const apiSecret = process.env.KITE_API_SECRET;

  const checksum = crypto
    .createHash("sha256")
    .update(apiKey + requestToken + apiSecret)
    .digest("hex");

  const response = await fetch("https://api.kite.trade/session/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Kite-Version": "3",
    },
    body: new URLSearchParams({
      api_key: apiKey,
      request_token: requestToken,
      checksum,
    }),
  });

  const data = await response.json();

  if (data.status !== "success") {
    return Response.json({
      success: false,
      message: data.message || "Kite login failed",
      raw: data,
    });
  }

  await adminDb.collection("system").doc("kite").set(
    {
      accessToken: data.data.access_token,
      userName: data.data.user_name || "",
      userId: data.data.user_id || "",
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  return new Response(
    `
      <html>
        <body style="background:#080808;color:#f3d98b;font-family:Arial;text-align:center;padding:40px;">
          <h1>Ronak Jewellers</h1>
          <h2>Kite reconnected successfully.</h2>
          <p>You can close this tab now.</p>
          <a href="/rj3895bullan-gullan" style="color:#f3d98b;">Go to Admin</a>
        </body>
      </html>
    `,
    {
      headers: {
        "Content-Type": "text/html",
      },
    }
  );
}
