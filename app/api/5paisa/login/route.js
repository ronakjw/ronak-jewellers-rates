export async function GET() {
  const vendorKey = process.env.FIVEPAISA_API_KEY;
  const responseUrl = process.env.FIVEPAISA_REDIRECT_URL;
  const state = "ronak-jewellers";

  const html = `
<!DOCTYPE html>
<html>
<body onload="document.forms[0].submit()">
<form method="POST" action="https://dev-openapi.5paisa.com/WebVendorLogin/VLogin/Index">
<input type="hidden" name="VendorKey" value="${vendorKey}" />
<input type="hidden" name="ResponseURL" value="${responseUrl}" />
<input type="hidden" name="State" value="${state}" />
</form>
<p>Redirecting to 5paisa...</p>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html",
    },
  });
}
