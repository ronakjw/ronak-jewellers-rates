import { adminDb } from "../../../../lib/firebaseAdmin";
import { getFivePaisaCreds, endOfDayIST } from "../../../../lib/fivepaisaAdmin";

function errorPage(message) {
  return new Response(
    `
      <html>
        <body style="background:#080808;color:#f3d98b;font-family:Arial;text-align:center;padding:40px;">
          <h1>Ronak Jewellers</h1>
          <h2>5paisa connection failed</h2>
          <p>${message}</p>
          <a href="/rj3895bullan-gullan" style="color:#f3d98b;">Go to Admin</a>
        </body>
      </html>
    `,
    { headers: { "Content-Type": "text/html" }, status: 400 }
  );
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const requestToken = searchParams.get("RequestToken");

  if (!requestToken) {
    return errorPage("Missing RequestToken from 5paisa.");
  }

  const { apiKey, userId, encryptionKey } = getFivePaisaCreds();

  if (!apiKey || !userId || !encryptionKey) {
    return errorPage(
      "Missing FIVEPAISA_API_KEY / FIVEPAISA_USER_ID / FIVEPAISA_ENCRYPTION_KEY environment variables."
    );
  }

  try {
    const response = await fetch(
      "https://Openapi.5paisa.com/VendorsAPI/Service1.svc/GetAccessToken",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          head: { Key: apiKey },
          body: {
            RequestToken: requestToken,
            EncryKey: encryptionKey,
            UserId: userId,
          },
        }),
      }
    );

    const data = await response.json();
    const accessToken = data?.body?.AccessToken;

    if (!accessToken) {
      return errorPage(data?.body?.Message || "5paisa did not return an access token.");
    }

    await adminDb.collection("system").doc("fivepaisa").set(
      {
        accessToken,
        clientCode: data.body.ClientCode || "",
        clientName: data.body.ClientName || "",
        expiresAt: endOfDayIST(),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return new Response(
      `
        <html>
          <body style="background:#080808;color:#f3d98b;font-family:Arial;text-align:center;padding:40px;">
            <h1>Ronak Jewellers</h1>
            <h2>5paisa reconnected successfully.</h2>
            <p>You can close this tab now.</p>
            <a href="/rj3895bullan-gullan" style="color:#f3d98b;">Go to Admin</a>
          </body>
        </html>
      `,
      { headers: { "Content-Type": "text/html" } }
    );
  } catch (err) {
    return errorPage(err.message || "Unable to reach 5paisa.");
  }
}
