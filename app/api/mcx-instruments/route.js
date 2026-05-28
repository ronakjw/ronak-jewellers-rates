export async function GET() {
  const response = await fetch("https://api.kite.trade/instruments/MCX", {
    headers: {
      "X-Kite-Version": "3",
    },
    cache: "no-store",
  });

  const csv = await response.text();

  const lines = csv.split("\n");
  const header = lines[0];

  const silverRows = lines
    .filter((line) => line.includes("SILVER"))
    .slice(0, 50);

  return new Response(
    JSON.stringify({
      success: response.ok,
      header,
      count: silverRows.length,
      sample: silverRows,
    }),
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
}
