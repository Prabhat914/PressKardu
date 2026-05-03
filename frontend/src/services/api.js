
import axios from "axios";

const DEFAULT_RENDER_API_BASE_URL = "https://presskardu.onrender.com/api";
const configuredApiBaseUrl = String(import.meta.env.VITE_API_BASE_URL || "").trim();
const isProductionHost =
  typeof window !== "undefined" &&
  window.location.hostname !== "localhost" &&
  window.location.hostname !== "127.0.0.1";
const apiBaseUrl = configuredApiBaseUrl || (isProductionHost ? DEFAULT_RENDER_API_BASE_URL : "/api");

if (
  isProductionHost &&
  configuredApiBaseUrl &&
  !/^https?:\/\//i.test(configuredApiBaseUrl)
) {
  console.warn(
    "VITE_API_BASE_URL should be an absolute URL when you intentionally bypass the same-origin /api proxy."
  );
}

const API = axios.create({
  baseURL: apiBaseUrl
});

API.interceptors.request.use((req) => {

  const token = localStorage.getItem("token");

  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }

  return req;

});

export default API;
