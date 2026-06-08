export async function POST(req) {
  try {
    const { command } = await req.json();

    const prompt = `
You are an admin assistant for Ronak Jewellers.

Convert the user's command into JSON.

Return ONLY valid JSON.

Allowed fields:
buyingPremium
sellingPremium
showRates
holidayMode
holidayBuyingRate
holidaySellingRate
kachhiBadlaValue
showPremium
volatilityWarningEnabled
noticeMessage

Examples:

"Buying premium minus 1500 kar do"

{
  "buyingPremium": -1500
}

"Holiday mode on kar do"

{
  "holidayMode": true
}

User command:
${command}
`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
        }),
      }
    );

    const data = await response.json();

    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    const cleaned = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    return Response.json({
      success: true,
      changes: JSON.parse(cleaned),
    });
  } catch (err) {
    return Response.json({
      success: false,
      message: err.message,
    });
  }
}
