import axios from "axios";

/**
 * Shared axios instance
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "",
  withCredentials: true,
});

/**
 * Generic request wrapper (used across app)
 */
export async function apiRequest(config: any) {
  const response = await api.request(config);
  return response.data;
}

/**
 * 🔥 THIS WAS MISSING — REQUIRED BY APP.TSX
 */
export function requireAuth() {
  const token = localStorage.getItem("token");

  if (!token) {
    window.location.href = "/login";
    throw new Error("Not authenticated");
  }

  return token;
}

/**
 * Keep default export (your earlier fix depends on it)
 */
export default api;
