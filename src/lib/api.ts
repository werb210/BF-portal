import axios, { AxiosRequestConfig } from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "",
  withCredentials: true,
});

/**
 * Standard request wrapper
 */
export async function apiRequest<T = unknown>(
  config: AxiosRequestConfig
): Promise<T> {
  const response = await api.request<T>(config);
  return response.data;
}

/**
 * REQUIRED BY APP + SESSION GUARD
 */
export function requireAuth(): string {
  const token = localStorage.getItem("token");

  if (!token) {
    window.location.href = "/login";
    throw new Error("Not authenticated");
  }

  return token;
}

export default api;
