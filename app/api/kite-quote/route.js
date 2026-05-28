export async function GET() {
  const apiKey = process.env.KITE_API_KEY;
  const accessToken = process.env.KITE_ACCESS_TOKEN;

  const contract = "SILVER26JULFUT";
  const instrument = `MCX:${contract}`;

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
  const quote = data?.data?.[instrument];

  if (!quote) {
    return Response.json({
      success: false,
      contract,
      message: "Quote not found",
      raw: data,
    });
  }

  return Response.json({
    success: true,
    contract,
    mcxBuyPrice: quote.depth?.buy?.[0]?.price ?? null,
    mcxSellPrice: quote.depth?.sell?.[0]?.price ?? null,
    lastPrice: quote.last_price,
    timestamp: quote.timestamp,
    lastTradeTime: quote.last_trade_time,
  });
}
