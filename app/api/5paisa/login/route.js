export async function GET() {
  const vendorKey = process.env.FIVEPAISA_API_KEY;
  const responseUrl = encodeURIComponent(process.env.FIVEPAISA_REDIRECT_URL);

  const url =
    `https://dev-openapi.5paisa.com/WebVendorLogin/VLogin/Index?VendorKey=${vendorKey}&ResponseURL=${responseUrl}`;

  return Response.redirect(url);
}
