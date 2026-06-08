export async function POST(req) {
  try {
    const { command } = await req.json();

    if (!command || !command.trim()) {
      return Response.json({
        success: false,
        message: "Command is empty",
      });
    }

    const prompt = `
You are an admin command parser for Ronak Jewellers bullion rate website.

Convert the user's English/Hindi/Hinglish command into JSON settings changes.

Return ONLY valid JSON.
No markdown.
No explanation.

Allowed fields:
{
  "buyingPremium": number,
  "sellingPremium": number,
  "showRates": boolean,
  "holidayMode": boolean,
  "holidayBuyingRate": number,
  "holidaySellingRate": number,
  "kachhiBadlaEnabled": boolean,
  "kachhiBadlaValue": number,
  "kachhiBadlaUnit": "Rs/kg" | "gm/kg",
  "autoPremiumEnabled": boolean,
  "showPremium": boolean,
  "premiumStepSize": number,
  "premiumStepAdjustment": number,
  "volatilityWarningEnabled": boolean,
  "noticeMessage": string
}

Rules:
- If user says hide rates, set showRates false.
- If user says show rates, set showRates true.
- If user says premium hide, set showPremium false.
- If user says premium show, set showPremium true.
- If user says holiday mode on, set holidayMode true.
- If user says holiday mode off, set holidayMode false.
- Negative values like "minus 1500", "-1500", "negative 1500" must become -1500.
- If command is unclear, return {}.
- Do not invent fields.
- Do not include fields not requested by user.

User command:
"${command}"
`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
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

    const changes = JSON.parse(cleaned);

    return Response.json({
      success: true,
      changes,
    });
  } catch (err) {
    return Response.json({
      success: false,
      message: err.message || "AI command failed",
    });
  }
}
