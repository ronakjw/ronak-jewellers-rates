export async function GET() {
  const apiKey = process.env.KITE_API_KEY;
  const accessToken = process.env.KITE_ACCESS_TOKEN;

  const instrument = "MCX:SILVER26JULFUT"; // temporary test symbol

  const response = await fetch(
    `https://api.kite.trade/quote?i=${encodeURIComponent(instrument)}`,
    {
      headers: {
        "X-Kite-Version": "3",
        Authorization: `token ${apiKey}:${accessToken}`,
      },
      cache: "no-store",
    }
  );

  const data = await response.json();

  return Response.json({
    success: response.ok,
    instrument,
    data,
  });
}
