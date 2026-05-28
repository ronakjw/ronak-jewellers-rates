export async function GET() {
  return Response.json({
    apiKeyExists: !!process.env.KITE_API_KEY,
    apiSecretExists: !!process.env.KITE_API_SECRET,
  });
}
