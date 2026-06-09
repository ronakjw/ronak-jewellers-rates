export async function POST(req) {
  try {
const { command, currentSettings } = await req.json();
    
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

Current website settings:
${JSON.stringify(currentSettings, null, 2)}

Important:
- If user says "increase", "decrease", "reduce", "add", or "minus", calculate using currentSettings.
- Example: if current buyingPremium is 5000 and user says "reduce buying premium by 500", return {"buyingPremium":4500}.
- Example: if current buyingPremium is -1500 and user says "reduce buying premium by 500", return {"buyingPremium":-2000}.

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
