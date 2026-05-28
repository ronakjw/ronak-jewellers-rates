export async function GET() {
  const apiKey = process.env.KITE_API_KEY;

  return Response.json({
    success: true,
    apiKeyExists: !!apiKey,
    apiKeyPreview: apiKey
      ? apiKey.substring(0, 6) + "..."
      : null,
  });
}
