
import axios from "axios";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "/api";

if (
  typeof window !== "undefined" &&
  window.location.hostname !== "localhost" &&
  window.location.hostname !== "127.0.0.1" &&
  apiBaseUrl === "/api"
) {
  console.warn(
    "VITE_API_BASE_URL is not set for this production build. If frontend and backend are deployed on different domains, set it to your live backend URL ending with /api."
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
