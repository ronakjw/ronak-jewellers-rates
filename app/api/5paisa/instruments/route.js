// Debug/verification route — lets you confirm the real column names and
// scrip codes 5paisa returns for MCX GOLD/SILVER before relying on them in
// production. Same purpose as the old /api/mcx-instruments debug route.
export async function GET() {
  const response = await fetch(
    "https://Openapi.5paisa.com/VendorsAPI/Service1.svc/ScripMaster/segment/All",
    { cache: "no-store" }
  );

  const csv = await response.text();
  const lines = csv.split("\n");
  const header = lines[0];

  // Check the `header` field in the response to see which column is Exch,
  // then confirm the matching rows below actually say "M" (MCX) there.
  const matches = lines
    .filter((line) => line.includes("GOLD") || line.includes("SILVER"))
    .slice(0, 80);

  return Response.json({
    success: response.ok,
    header,
    count: matches.length,
    sample: matches,
  });
}
