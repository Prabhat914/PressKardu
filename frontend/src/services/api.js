
import axios from "axios";

const DEFAULT_RENDER_API_BASE_URL = "https://presskardu.onrender.com/api";
const configuredApiBaseUrl = String(import.meta.env.VITE_API_BASE_URL || "").trim();
const isProductionHost =
  typeof window !== "undefined" &&
  window.location.hostname !== "localhost" &&
  window.location.hostname !== "127.0.0.1";

function resolveApiBaseUrl() {
  if (!isProductionHost) {
    return configuredApiBaseUrl || "/api";
  }

  if (!configuredApiBaseUrl) {
    return DEFAULT_RENDER_API_BASE_URL;
  }

  if (/^https?:\/\//i.test(configuredApiBaseUrl)) {
    return configuredApiBaseUrl;
  }

  // In production, prefer the known backend origin when the Vercel /api proxy
  // is unavailable or not configured as a function route.
  return DEFAULT_RENDER_API_BASE_URL;
}

const apiBaseUrl = resolveApiBaseUrl();

if (configuredApiBaseUrl && !/^https?:\/\//i.test(configuredApiBaseUrl)) {
  console.warn(
    "Relative VITE_API_BASE_URL detected. Production requests will fall back to the deployed backend origin if the /api proxy is unavailable."
  );
}

const API = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15000
});

API.interceptors.request.use((req) => {

  const token = localStorage.getItem("token");

  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }

  return req;

});

export default API;
