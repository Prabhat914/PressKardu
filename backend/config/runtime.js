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

function getAllowedOrigins() {
  return String(process.env.CORS_ORIGIN || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function isExplicitOriginAllowed(origin) {
  const allowedOrigins = getAllowedOrigins();

  return allowedOrigins.includes(origin);
}

function isMatchingVercelPreviewOrigin(origin) {
  if (!origin) {
    return false;
  }

  try {
    const parsedOrigin = new URL(origin);

    if (parsedOrigin.protocol !== "https:" || !parsedOrigin.hostname.endsWith(".vercel.app")) {
      return false;
    }

    return getAllowedOrigins().some((allowedOrigin) => {
      try {
        const allowedUrl = new URL(allowedOrigin);

        if (allowedUrl.protocol !== "https:" || !allowedUrl.hostname.endsWith(".vercel.app")) {
          return false;
        }

        const allowedProjectHost = allowedUrl.hostname.replace(/\.vercel\.app$/, "");
        return parsedOrigin.hostname === allowedUrl.hostname || parsedOrigin.hostname.startsWith(`${allowedProjectHost}-`);
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
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
    const isPreviewOrigin =
      (allowPreviewOrigins && protocol === "https:" && hostname.endsWith(".vercel.app")) ||
      isMatchingVercelPreviewOrigin(origin);

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
  const explicitUrl = String(process.env.APP_BASE_URL || "").trim();

  if (explicitUrl) {
    return explicitUrl;
  }

  return String(process.env.RENDER_EXTERNAL_URL || "").trim();
}

function getAdminEmail() {
  return String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
}

function validateProductionConfig() {
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
  getAdminEmail,
  validateProductionConfig
};
