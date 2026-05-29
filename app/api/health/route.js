export async function GET() {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/kite-quote`,
      {
        cache: "no-store",
      }
    );

    const data = await response.json();

    return Response.json({
      website: "online",
      kite: data.success,
      contract: data.contract || null,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return Response.json({
      website: "online",
      kite: false,
      error: err.message,
    });
  }
}
