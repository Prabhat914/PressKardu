function getClientKey(req) {
  const forwardedFor = req.headers["x-forwarded-for"];
  const ipFromHeader = Array.isArray(forwardedFor) ? forwardedFor[0] : String(forwardedFor || "").split(",")[0].trim();
  return ipFromHeader || req.ip || req.connection?.remoteAddress || "unknown";
}

function createRateLimiter({ windowMs, limit, message }) {
  const hits = new Map();

  return (req, res, next) => {
    const key = `${getClientKey(req)}:${req.path}`;
    const now = Date.now();
    const current = hits.get(key);

    if (!current || current.expiresAt <= now) {
      hits.set(key, {
        count: 1,
        expiresAt: now + windowMs
      });
      return next();
    }

    if (current.count >= limit) {
      const retryAfterSeconds = Math.max(1, Math.ceil((current.expiresAt - now) / 1000));
      res.setHeader("Retry-After", retryAfterSeconds);
      return res.status(429).json({
        message,
        retryAfterSeconds
      });
    }

    current.count += 1;
    hits.set(key, current);
    return next();
  };
}

module.exports = {
  createRateLimiter
};
