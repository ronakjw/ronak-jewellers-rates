export async function GET(req) {
  const { searchParams } = new URL(req.url);

  const requestToken =
    searchParams.get("request_token");

  return Response.json({
    success: true,
    requestToken,
  });
}
