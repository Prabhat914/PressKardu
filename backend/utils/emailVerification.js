const EmailVerificationSession = require("../models/EmailVerificationSession");

const EMAIL_OTP_EXPIRY_MINUTES = Number(process.env.EMAIL_OTP_EXPIRY_MINUTES || process.env.OTP_EXPIRY_MINUTES || 10);
const EMAIL_VERIFICATION_MAX_AGE_MINUTES = Number(
  process.env.EMAIL_VERIFICATION_MAX_AGE_MINUTES || EMAIL_OTP_EXPIRY_MINUTES
);

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

async function getVerifiedEmailSession(email) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return null;
  }

  const session = await EmailVerificationSession.findOne({ email: normalizedEmail });

  if (!session?.verifiedAt) {
    return null;
  }

  const ageMs = Date.now() - new Date(session.verifiedAt).getTime();
  if (ageMs > EMAIL_VERIFICATION_MAX_AGE_MINUTES * 60 * 1000) {
    return null;
  }

  return session;
}

module.exports = {
  EMAIL_OTP_EXPIRY_MINUTES,
  EMAIL_VERIFICATION_MAX_AGE_MINUTES,
  getVerifiedEmailSession,
  normalizeEmail
};
