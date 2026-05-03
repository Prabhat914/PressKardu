const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "content-length",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade"
]);

const DEFAULT_RENDER_BACKEND_URL = "https://presskardu-backend.onrender.com";

function getBackendApiBaseUrl() {
  const configuredUrl = String(
    process.env.BACKEND_PUBLIC_URL || DEFAULT_RENDER_BACKEND_URL
  ).trim();

  if (!configuredUrl) {
    return "";
  }

  return configuredUrl.endsWith("/api")
    ? configuredUrl.replace(/\/+$/, "")
    : `${configuredUrl.replace(/\/+$/, "")}/api`;
}

function buildTargetUrl(req) {
  const backendApiBaseUrl = getBackendApiBaseUrl();

  if (!backendApiBaseUrl) {
    return "";
  }

  const pathSegments = Array.isArray(req.query.path)
    ? req.query.path
    : req.query.path
      ? [req.query.path]
      : [];
  const targetUrl = new URL(`${backendApiBaseUrl}/${pathSegments.join("/")}`);
  const query = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";

  if (query) {
    targetUrl.search = query.slice(1);
  }

  return targetUrl.toString();
}

function readRequestBody(req) {
  if (Buffer.isBuffer(req.body)) {
    return Promise.resolve(req.body);
  }

  if (typeof req.body === "string") {
    return Promise.resolve(Buffer.from(req.body));
  }

  if (req.body && typeof req.body === "object") {
    return Promise.resolve(Buffer.from(JSON.stringify(req.body)));
  }

  return new Promise((resolve, reject) => {
    const chunks = [];

    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function getForwardHeaders(req) {
  const headers = {};

  Object.entries(req.headers).forEach(([key, value]) => {
    if (HOP_BY_HOP_HEADERS.has(key.toLowerCase()) || value === undefined) {
      return;
    }

    headers[key] = value;
  });

  headers["x-forwarded-host"] = req.headers.host || "";
  headers["x-forwarded-proto"] = "https";

  return headers;
}

function copyResponseHeaders(sourceHeaders, res) {
  sourceHeaders.forEach((value, key) => {
    if (HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      return;
    }

    res.setHeader(key, value);
  });
}

export default async function handler(req, res) {
  const targetUrl = buildTargetUrl(req);

  if (!targetUrl) {
    return res.status(500).json({
      message: "BACKEND_PUBLIC_URL is not configured for the Vercel API proxy."
    });
  }

  try {
    const method = req.method || "GET";
    const body =
      method === "GET" || method === "HEAD"
        ? undefined
        : await readRequestBody(req);
    const upstreamResponse = await fetch(targetUrl, {
      method,
      headers: getForwardHeaders(req),
      body
    });
    const responseBuffer = Buffer.from(await upstreamResponse.arrayBuffer());

    copyResponseHeaders(upstreamResponse.headers, res);
    res.status(upstreamResponse.status).send(responseBuffer);
  } catch (error) {
    res.status(502).json({
      message: "Backend proxy request failed.",
      detail: error instanceof Error ? error.message : "Unknown proxy error"
    });
  }
}
