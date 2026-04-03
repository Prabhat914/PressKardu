const baseUrl = process.env.PRESSKARDU_API_BASE_URL || "http://127.0.0.1:5000/api";
const uniqueId = Date.now();
const email = `smoke-${uniqueId}@example.com`;
const password = "123456";
const shopEmail = `shop-smoke-${uniqueId}@example.com`;
const shopPassword = "123456";
const shopPhone = `90000${String(uniqueId).slice(-5)}`;
const updatedShopPhone = `90100${String(uniqueId).slice(-5)}`;
const samplePhoto = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WnSUswAAAAASUVORK5CYII=";

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(`${path} failed (${response.status}): ${text}`);
  }

  return data;
}

async function main() {
  const health = await request("/health");
  console.log("health:", health);
  console.log("otp providers:", health.otpProviders);

  const signup = await request("/auth/signup", {
    method: "POST",
    body: JSON.stringify({
      name: "Smoke Test User",
      email,
      password,
      role: "user"
    })
  });
  console.log("signup ok:", signup.user.email);

  const login = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email,
      password
    })
  });
  console.log("login ok:", login.user.email);

  const orders = await request("/orders/my", {
    headers: {
      Authorization: `Bearer ${login.token}`
    }
  });
  console.log("orders fetched:", Array.isArray(orders) ? orders.length : 0);

  const phoneOtpSend = await request("/auth/phone-verification/send-otp", {
    method: "POST",
    body: JSON.stringify({
      phone: shopPhone
    })
  });
  console.log("phone otp provider:", phoneOtpSend.delivery?.provider || "unknown");

  if (!phoneOtpSend.debugOtp) {
    console.log("advanced verification smoke skipped: debug OTP is not exposed");
    return;
  }

  await request("/auth/phone-verification/verify-otp", {
    method: "POST",
    body: JSON.stringify({
      phone: shopPhone,
      otp: phoneOtpSend.debugOtp
    })
  });
  console.log("shop phone otp verified");

  const shopSignup = await request("/auth/signup", {
    method: "POST",
    body: JSON.stringify({
      name: "Smoke Test Shopkeeper",
      email: shopEmail,
      password: shopPassword,
      phone: shopPhone,
      role: "presswala",
      phoneOtpVerified: true,
      shopName: `Smoke Press ${uniqueId}`,
      address: "221B Test Street, Jaipur, Rajasthan",
      latitude: 26.9124,
      longitude: 75.7873,
      pricePerCloth: 12,
      serviceRadiusKm: 5,
      shopPhotoDataUrl: samplePhoto
    })
  });
  console.log("shop signup ok:", shopSignup.user.email, shopSignup.pressShop?.verificationStatus);

  const shopLogin = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: shopEmail,
      password: shopPassword
    })
  });
  console.log("shop login ok:", shopLogin.user.email);

  if (!process.env.PRESSKARDU_ADMIN_EMAIL || !process.env.PRESSKARDU_ADMIN_PASSWORD) {
    console.log("advanced admin smoke skipped: admin credentials not provided");
    return;
  }

  const adminLogin = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: process.env.PRESSKARDU_ADMIN_EMAIL,
      password: process.env.PRESSKARDU_ADMIN_PASSWORD
    })
  });
  console.log("admin login ok:", adminLogin.user.email);

  const adminShops = await request("/admin/shops", {
    headers: {
      Authorization: `Bearer ${adminLogin.token}`
    }
  });
  const createdShop = Array.isArray(adminShops)
    ? adminShops.find((item) => item.ownerUser?.email === shopEmail)
    : null;

  if (!createdShop?._id) {
    throw new Error("Advanced verification smoke failed: created shop not found in admin queue");
  }

  const approvedShop = await request(`/admin/shops/${createdShop._id}/review`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${adminLogin.token}`
    },
    body: JSON.stringify({
      verificationStatus: "approved",
      verificationNotes: "Smoke test approval passed."
    })
  });
  console.log("shop approved:", approvedShop.shop?.verificationStatus);

  const updatePhoneOtpSend = await request("/auth/phone-verification/send-otp", {
    method: "POST",
    body: JSON.stringify({
      phone: updatedShopPhone
    })
  });

  await request("/auth/phone-verification/verify-otp", {
    method: "POST",
    body: JSON.stringify({
      phone: updatedShopPhone,
      otp: updatePhoneOtpSend.debugOtp
    })
  });

  const updatedProfile = await request("/user/profile", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${shopLogin.token}`
    },
    body: JSON.stringify({
      phone: updatedShopPhone,
      about: "Updated from verification smoke."
    })
  });
  console.log("profile update status:", updatedProfile.pressShop?.verificationStatus);

  const reapprovedShop = await request(`/admin/shops/${createdShop._id}/review`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${adminLogin.token}`
    },
    body: JSON.stringify({
      verificationStatus: "approved",
      verificationNotes: "Smoke test re-approval passed."
    })
  });
  console.log("shop reapproved:", reapprovedShop.shop?.verificationStatus);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
