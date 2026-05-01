const crypto = require("crypto");

function getPaymentSecret() {
  return process.env.PAYMENT_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET || "";
}

function getPaymentProvider() {
  return process.env.PAYMENT_PROVIDER || "manual-signature";
}

function getPaymentCurrency() {
  return process.env.PAYMENT_CURRENCY || "INR";
}

function supportsHostedSubscriptionPayments() {
  return (
    getPaymentProvider() === "razorpay" &&
    Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)
  );
}

function toSubunits(amount) {
  return Math.round(Number(amount || 0) * 100);
}

async function createRazorpayOrder(order) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("Razorpay keys are not configured");
  }

  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      amount: toSubunits(order.totalPrice),
      currency: getPaymentCurrency(),
      receipt: String(order._id),
      notes: {
        internalOrderId: String(order._id),
        pressShopId: String(order.pressShop)
      }
    })
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error?.description || "Razorpay order creation failed");
  }

  return {
    provider: "razorpay",
    keyId,
    gatewayOrderId: payload.id,
    amount: payload.amount,
    currency: payload.currency,
    internalOrderId: String(order._id),
    description: "Press service order payment",
    verificationMode: "signature"
  };
}

async function createPaymentSession(order) {
  if (!order || order.paymentMode !== "online") {
    return null;
  }

  const provider = getPaymentProvider();

  if (provider === "razorpay") {
    return createRazorpayOrder(order);
  }

  const gatewayOrderId =
    order.paymentVerification?.gatewayOrderId || `pk_order_${order._id}_${Date.now()}`;

  return {
    provider,
    gatewayOrderId,
    amount: toSubunits(order.totalPrice),
    currency: getPaymentCurrency(),
    internalOrderId: String(order._id),
    verificationMode: "signature",
    message: "Complete payment in your gateway and verify it with gateway order id, payment id, and signature."
  };
}

function buildExpectedSignature({ gatewayOrderId, gatewayPaymentId }) {
  const secret = getPaymentSecret();

  if (!secret) {
    throw new Error("Payment verification secret is not configured");
  }

  return crypto
    .createHmac("sha256", secret)
    .update(`${gatewayOrderId}|${gatewayPaymentId}`)
    .digest("hex");
}

async function createSubscriptionPaymentSession({ shopId, amount, receipt }) {
  if (!Number(amount)) {
    return null;
  }

  const provider = getPaymentProvider();

  if (provider === "razorpay") {
    return createRazorpayOrder({
      _id: receipt || shopId,
      totalPrice: amount,
      pressShop: shopId
    });
  }

  const gatewayOrderId = `pk_subscription_${shopId}_${Date.now()}`;

  return {
    provider,
    gatewayOrderId,
    amount: toSubunits(amount),
    currency: getPaymentCurrency(),
    internalOrderId: String(shopId),
    verificationMode: "signature",
    description: "PressKardu shop subscription payment",
    message: "Complete subscription payment and verify it with gateway order id, payment id, and signature."
  };
}

module.exports = {
  createPaymentSession,
  createSubscriptionPaymentSession,
  buildExpectedSignature,
  getPaymentSecret,
  getPaymentProvider,
  supportsHostedSubscriptionPayments
};
