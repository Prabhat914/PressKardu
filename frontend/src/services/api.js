
import axios from "axios";

const configuredApiBaseUrl = String(import.meta.env.VITE_API_BASE_URL || "").trim();
const apiBaseUrl = configuredApiBaseUrl || "/api";

if (
  typeof window !== "undefined" &&
  window.location.hostname !== "localhost" &&
  window.location.hostname !== "127.0.0.1" &&
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
