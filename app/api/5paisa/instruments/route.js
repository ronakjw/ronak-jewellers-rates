// Debug/verification route — filters specifically for MCX (Exch === "M")
// rows containing GOLD or SILVER, since the full scrip master is dominated
// by equity/ETF/mutual-fund rows that also match those keywords.
export async function GET() {
  const response = await fetch(
    "https://Openapi.5paisa.com/VendorsAPI/Service1.svc/ScripMaster/segment/All",
    { cache: "no-store" }
  );

  const csv = await response.text();
  const lines = csv.split("\n");
  const header = lines[0];

  // Exch is confirmed to be the first column from your header:
  // Exch,ExchType,ScripCode,Name,Expiry,ScripType,StrikeRate,FullName,...
  const mcxMatches = lines
    .slice(1)
    .filter((line) => line.startsWith("M,"))
    .filter((line) => line.includes("GOLD") || line.includes("SILVER"));

  return Response.json({
    success: response.ok,
    header,
    totalLines: lines.length,
    mcxCount: mcxMatches.length,
    sample: mcxMatches.slice(0, 100),
  });
}
