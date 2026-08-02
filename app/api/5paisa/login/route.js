import { getFivePaisaCreds } from "../../../../lib/fivepaisaAdmin";

export async function GET() {
  const { apiKey, redirectUrl } = getFivePaisaCreds();

  if (!apiKey || !redirectUrl) {
    return Response.json({
      success: false,
      message:
        "Missing FIVEPAISA_API_KEY or FIVEPAISA_REDIRECT_URL environment variable.",
    });
  }

  const loginUrl =
    `https://dev-openapi.5paisa.com/WebVendorLogin/VLogin/Index` +
    `?VendorKey=${encodeURIComponent(apiKey)}` +
    `&ResponseURL=${encodeURIComponent(redirectUrl)}`;

  return Response.redirect(loginUrl);
}
