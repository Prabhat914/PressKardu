const isProduction = process.env.NODE_ENV === "production";

function readBoolean(value, fallback = false) {
  if (value === undefined) {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
}

function assertProductionRequirement(condition, message) {
  if (isProduction && !condition) {
    throw new Error(message);
  }
}

function getJwtSecret() {
  const value = String(process.env.JWT_SECRET || "").trim();

  if (!value) {
    if (isProduction) {
      throw new Error("JWT_SECRET must be configured in production.");
    }

    return "dev-only-secret-change-me";
  }

  if (isProduction && value.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters in production.");
  }

  return value;
}

function isExplicitOriginAllowed(origin) {
  const allowedOrigins = String(process.env.CORS_ORIGIN || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return allowedOrigins.includes(origin);
}

function isTrustedOrigin(origin) {
  if (!origin) {
    return true;
  }

  if (isExplicitOriginAllowed(origin)) {
    return true;
  }

  try {
    const { hostname, protocol } = new URL(origin);
    const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";
    const allowPreviewOrigins = readBoolean(process.env.ALLOW_VERCEL_PREVIEW_ORIGINS, false);
    const isPreviewOrigin = allowPreviewOrigins && protocol === "https:" && hostname.endsWith(".vercel.app");

    if (!isProduction && isLocalhost) {
      return true;
    }

    return isPreviewOrigin;
  } catch {
    return false;
  }
}

function allowDebugOtpExposure() {
  return !isProduction && readBoolean(process.env.ALLOW_DEBUG_OTP, false);
}

function allowConsoleOtpFallback() {
  return !isProduction && readBoolean(process.env.ALLOW_CONSOLE_OTP_FALLBACK, true);
}

function getAppBaseUrl() {
  return String(process.env.APP_BASE_URL || "").trim();
}

function validateProductionConfig() {
  assertProductionRequirement(getAppBaseUrl(), "APP_BASE_URL must be configured in production.");
  assertProductionRequirement(String(process.env.CORS_ORIGIN || "").trim(), "CORS_ORIGIN must be configured in production.");
  assertProductionRequirement(String(process.env.MONGO_URI || "").trim(), "MONGO_URI must be configured in production.");
  getJwtSecret();
}

module.exports = {
  isProduction,
  readBoolean,
  getJwtSecret,
  isTrustedOrigin,
  allowDebugOtpExposure,
  allowConsoleOtpFallback,
  validateProductionConfig
};
