export async function POST(req) {
  try {
    const { question, currentSettings, systemStatus } = await req.json();

    const prompt = `
You are RJ Business Operator for Ronak Jewellers bullion rate website.

Give practical business advice only. Do not return JSON.
Keep answer direct and useful.

Current settings:
${JSON.stringify(currentSettings, null, 2)}

System status:
${JSON.stringify(systemStatus, null, 2)}

User question:
${question}
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
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    const data = await response.json();

    const advice =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No advice received.";

    return Response.json({
      success: true,
      advice,
    });
  } catch (err) {
    return Response.json({
      success: false,
      message: err.message,
    });
  }
}
