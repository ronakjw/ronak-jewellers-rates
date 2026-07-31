import { adminDb } from "../../../lib/firebaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const requestToken = searchParams.get("RequestToken");

    if (!requestToken) {
      return Response.json(
        {
          success: false,
          message: "RequestToken not found",
        },
        { status: 400 }
      );
    }

    const response = await fetch(
      "https://Openapi.5paisa.com/VendorsAPI/Service1.svc/V2/AccessToken",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          head: {
            Key: process.env.FIVEPAISA_API_KEY,
          },
          body: {
            RequestToken: requestToken,
            EncryKey: process.env.FIVEPAISA_ENCRYPTION_KEY,
            UserId: process.env.FIVEPAISA_USER_ID,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        `5paisa returned HTTP ${response.status}`
      );
    }

    const data = await response.json();

    if (
      data?.head?.Status !== 0 ||
      !data?.body?.AccessToken
    ) {
      return Response.json(
        {
          success: false,
          fivePaisaResponse: data,
        },
        { status: 500 }
      );
    }

    await adminDb
      .collection("system")
      .doc("fivepaisa")
      .set(
        {
          accessToken: data.body.AccessToken,
          refreshToken: data.body.RefreshToken || "",
          clientCode: data.body.ClientCode || "",
          updatedAt: new Date(),
        },
        { merge: true }
      );

    return new Response(
      `
      <html>
      <body style="font-family:Arial;padding:40px">
      <h2>✅ 5paisa Login Successful</h2>
      <p>Access Token saved to Firestore.</p>
      <p>You may close this window.</p>
      </body>
      </html>
      `,
      {
        headers: {
          "Content-Type": "text/html",
        },
      }
    );
  } catch (err) {
    return Response.json(
      {
        success: false,
        message: err.message,
      },
      { status: 500 }
    );
  }
}
