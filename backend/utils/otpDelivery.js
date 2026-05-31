const { allowConsoleOtpFallback } = require("../config/runtime");

async function postJson(url, payload, options = {}) {
  const response = await fetch(url, {
    method: options.method || "POST",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "OTP delivery failed");
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

async function readProviderError(response, fallbackMessage) {
  const text = await response.text();

  if (!text) {
    return fallbackMessage;
  }

  try {
    const payload = JSON.parse(text);
    return payload.message || payload.error || fallbackMessage;
  } catch {
    return text;
  }
}

function requireValue(value, message) {
  if (!value) {
    throw new Error(message);
  }
}

async function sendViaResend({ email, otp, subject, html }) {
  requireValue(process.env.RESEND_API_KEY, "RESEND_API_KEY is not configured");
  requireValue(process.env.RESEND_FROM_EMAIL, "RESEND_FROM_EMAIL is not configured");

  await postJson(
    "https://api.resend.com/emails",
    {
      from: process.env.RESEND_FROM_EMAIL,
      to: [email],
      subject: subject || "PressKardu verification OTP",
      html: html || `<p>Your PressKardu OTP is <strong>${otp}</strong>.</p><p>It expires in 10 minutes.</p>`
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`
      }
    }
  );

  return { channel: "email", target: email, provider: "resend" };
}

async function sendViaBrevo({ email, otp, subject, html }) {
  requireValue(process.env.BREVO_API_KEY, "BREVO_API_KEY is not configured");
  requireValue(process.env.BREVO_FROM_EMAIL, "BREVO_FROM_EMAIL is not configured");

  await postJson(
    "https://api.brevo.com/v3/smtp/email",
    {
      sender: {
        email: process.env.BREVO_FROM_EMAIL,
        name: process.env.BREVO_FROM_NAME || "PressKardu"
      },
      to: [{ email }],
      subject: subject || "PressKardu verification OTP",
      htmlContent: html || `<p>Your PressKardu OTP is <strong>${otp}</strong>.</p><p>It expires in 10 minutes.</p>`
    },
    {
      headers: {
        "api-key": process.env.BREVO_API_KEY
      }
    }
  );

  return { channel: "email", target: email, provider: "brevo" };
}

async function sendViaTwilio({ phone, otp, message }) {
  requireValue(process.env.TWILIO_ACCOUNT_SID, "TWILIO_ACCOUNT_SID is not configured");
  requireValue(process.env.TWILIO_AUTH_TOKEN, "TWILIO_AUTH_TOKEN is not configured");
  requireValue(process.env.TWILIO_PHONE_NUMBER, "TWILIO_PHONE_NUMBER is not configured");

  const params = new URLSearchParams({
    To: phone,
    From: process.env.TWILIO_PHONE_NUMBER,
    Body: message || `Your PressKardu OTP is ${otp}. It expires in 10 minutes.`
  });

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params.toString()
    }
  );

  if (!response.ok) {
    const providerMessage = await readProviderError(response, "Twilio SMS delivery failed");
    const isInvalidSender = providerMessage.toLowerCase().includes("invalid") &&
      (providerMessage.toLowerCase().includes("from") || providerMessage.toLowerCase().includes("caller id"));
    const configHint = isInvalidSender
      ? " Use a Twilio-owned sender number in E.164 format, for example +1234567890."
      : "";

    throw new Error(`${providerMessage}${configHint}`);
  }

  return { channel: "sms", target: phone, provider: "twilio" };
}

async function sendViaWebhook({ channel, email, phone, otp, subject, message }) {
  if (channel === "email" && process.env.OTP_EMAIL_WEBHOOK_URL) {
    await postJson(process.env.OTP_EMAIL_WEBHOOK_URL, {
      to: email,
      subject: subject || "PressKardu verification OTP",
      message: message || `Your PressKardu OTP is ${otp}. It expires in 10 minutes.`
    });
    return { channel, target: email, provider: "email-webhook" };
  }

  if (channel === "sms" && process.env.OTP_SMS_WEBHOOK_URL) {
    await postJson(process.env.OTP_SMS_WEBHOOK_URL, {
      to: phone,
      message: message || `Your PressKardu OTP is ${otp}. It expires in 10 minutes.`
    });
    return { channel, target: phone, provider: "sms-webhook" };
  }

  return null;
}

async function deliverResetOtp({ channel, email, phone, otp }) {
  return deliverOtp({
    channel,
    email,
    phone,
    otp,
    purpose: "password reset"
  });
}

async function deliverOtp({ channel, email, phone, otp, purpose = "verification" }) {
  const target = channel === "sms" ? phone : email;
  const emailSubject = `PressKardu ${purpose} OTP`;
  const htmlMessage = `<p>Your PressKardu ${purpose} OTP is <strong>${otp}</strong>.</p><p>It expires in 10 minutes.</p>`;
  const textMessage = `Your PressKardu ${purpose} OTP is ${otp}. It expires in 10 minutes.`;
  const providerErrors = [];

  async function tryProvider(providerName, sender) {
    try {
      return await sender();
    } catch (error) {
      const message = error?.message || "Unknown provider error";
      providerErrors.push(`${providerName}: ${message}`);
      console.error(`OTP delivery provider failed (${providerName}):`, message);
      return null;
    }
  }

  if (channel === "email") {
    if (process.env.RESEND_API_KEY) {
      const delivery = await tryProvider("resend", async () => {
        return await sendViaResend({ email, otp, subject: emailSubject, html: htmlMessage });
      });

      if (delivery) {
        return delivery;
      }
    }

    if (process.env.BREVO_API_KEY) {
      const delivery = await tryProvider("brevo", async () => {
        return await sendViaBrevo({ email, otp, subject: emailSubject, html: htmlMessage });
      });

      if (delivery) {
        return delivery;
      }
    }
  }

  if (channel === "sms" && process.env.TWILIO_ACCOUNT_SID) {
    const delivery = await tryProvider("twilio", async () => {
      return await sendViaTwilio({ phone, otp, message: textMessage });
    });

    if (delivery) {
      return delivery;
    }
  }

  const webhookDelivery = await tryProvider(`${channel}-webhook`, async () => {
    return await sendViaWebhook({ channel, email, phone, otp, subject: emailSubject, message: textMessage });
  });

  if (webhookDelivery) {
    return webhookDelivery;
  }

  if (!allowConsoleOtpFallback()) {
    const errorMessage = providerErrors.length
      ? `${channel.toUpperCase()} OTP delivery failed. ${providerErrors.join(" | ")}`
      : `No ${channel.toUpperCase()} OTP provider is configured.`;
    const error = new Error(errorMessage);
    error.statusCode = 503;
    error.expose = true;
    throw error;
  }

  if (providerErrors.length) {
    console.warn(`Using console OTP fallback after ${channel} provider failure.`);
  } else {
    const missingProviderMessage = `No ${channel.toUpperCase()} OTP provider is configured.`;
    if (channel === "email" || channel === "sms") {
      console.warn(missingProviderMessage);
    }
  }

  console.log(`[OTP:${channel}] ${target} -> ${otp}`);
  return { channel, target, provider: "console-fallback" };
}

function getOtpDeliveryStatus() {
  return {
    email: {
      configured: Boolean(
        (process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL) ||
        (process.env.BREVO_API_KEY && process.env.BREVO_FROM_EMAIL) ||
        process.env.OTP_EMAIL_WEBHOOK_URL
      ),
      provider: process.env.RESEND_API_KEY
        ? "resend"
        : process.env.BREVO_API_KEY
        ? "brevo"
        : process.env.OTP_EMAIL_WEBHOOK_URL
        ? "email-webhook"
        : "console-fallback"
    },
    sms: {
      configured: Boolean(
        (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) ||
        process.env.OTP_SMS_WEBHOOK_URL
      ),
      provider: process.env.TWILIO_ACCOUNT_SID
        ? "twilio"
        : process.env.OTP_SMS_WEBHOOK_URL
        ? "sms-webhook"
        : "console-fallback"
    }
  };
}

module.exports = {
  deliverOtp,
  deliverResetOtp,
  getOtpDeliveryStatus
};
