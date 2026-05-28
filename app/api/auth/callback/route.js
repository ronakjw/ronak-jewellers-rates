import crypto from "crypto";

export async function GET(req) {
  const { searchParams } = new URL(req.url);

  const requestToken =
    searchParams.get("request_token");

  const apiKey = process.env.KITE_API_KEY;
  const apiSecret = process.env.KITE_API_SECRET;

  const checksum = crypto
    .createHash("sha256")
    .update(apiKey + requestToken + apiSecret)
    .digest("hex");

  const response = await fetch(
    "https://api.kite.trade/session/token",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded",
        "X-Kite-Version": "3",
      },
      body: new URLSearchParams({
        api_key: apiKey,
        request_token: requestToken,
        checksum,
      }),
    }
  );

  const data = await response.json();

  return Response.json(data);
}
