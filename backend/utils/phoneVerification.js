const PhoneVerificationSession = require("../models/PhoneVerificationSession");

const PHONE_OTP_EXPIRY_MINUTES = Number(process.env.PHONE_OTP_EXPIRY_MINUTES || 10);
const PHONE_VERIFICATION_MAX_AGE_MINUTES = Number(
  process.env.PHONE_VERIFICATION_MAX_AGE_MINUTES || PHONE_OTP_EXPIRY_MINUTES
);

function normalizePhone(phone) {
  return String(phone || "").replace(/\D/g, "");
}

async function getVerifiedPhoneSession(phone) {
  const normalizedPhone = normalizePhone(phone);

  if (!normalizedPhone) {
    return null;
  }

  const session = await PhoneVerificationSession.findOne({ phone: normalizedPhone });

  if (!session?.verifiedAt) {
    return null;
  }

  const ageMs = Date.now() - new Date(session.verifiedAt).getTime();
  if (ageMs > PHONE_VERIFICATION_MAX_AGE_MINUTES * 60 * 1000) {
    return null;
  }

  return session;
}

module.exports = {
  PHONE_OTP_EXPIRY_MINUTES,
  PHONE_VERIFICATION_MAX_AGE_MINUTES,
  getVerifiedPhoneSession,
  normalizePhone
};
