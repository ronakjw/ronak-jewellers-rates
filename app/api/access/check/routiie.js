import allowedUsers from "../../../../data/allowed-users.json";

function normalizeIndianMobile(value) {
  let digits = String(value || "").replace(/\D/g, "");

  if (digits.length === 14 && digits.startsWith("0091")) {
    digits = digits.slice(4);
  }

  if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2);
  }

  if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  if (digits.length > 10) {
    digits = digits.slice(-10);
  }

  return digits.length === 10 ? digits : "";
}

export async function POST(request) {
  try {
    const body = await request.json();
    const phone = normalizeIndianMobile(body.phone);

    if (!phone) {
      return Response.json({
        success: false,
        allowed: false,
        message: "Invalid mobile number",
      });
    }

    const profile = allowedUsers[phone];

    if (!profile) {
      return Response.json({
        success: true,
        allowed: false,
      });
    }

    return Response.json({
      success: true,
      allowed: true,
      profile: {
        phone,
        name: profile.name || "",
        firstName: profile.firstName || profile.name || "Guest",
        role: profile.role || "Dealer",
      },
    });
  } catch (err) {
    return Response.json({
      success: false,
      allowed: false,
      message: err.message || "Unable to check access",
    });
  }
}

