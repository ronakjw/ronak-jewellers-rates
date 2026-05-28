export async function GET() {
  const apiKey = process.env.KITE_API_KEY;

  const loginUrl =
    `https://kite.zerodha.com/connect/login?v=3&api_key=${apiKey}`;

  return Response.redirect(loginUrl);
}
