import axios from "axios";

function normalizeBase(url?: string) {
  if (!url) return "";
  return url.replace(/\/api\/?$/, "");
}

declare global {
  interface Window {
    RUNTIME_CONFIG?: {
      API_BASE_URL?: string;
    };
  }
}

const base =
  normalizeBase(import.meta.env.VITE_API_URL) ||
  normalizeBase(window.RUNTIME_CONFIG?.API_BASE_URL) ||
  "";

export const apiClient = axios.create({
  baseURL: `${base}/api`,
  withCredentials: true
});

export const get = <T = unknown>(url: string, config?: unknown) => apiClient.get<T>(url, config as any);
export const post = <T = unknown>(url: string, data?: unknown, config?: unknown) => apiClient.post<T>(url, data, config as any);
export const put = <T = unknown>(url: string, data?: unknown, config?: unknown) => apiClient.put<T>(url, data, config as any);
export const patch = <T = unknown>(url: string, data?: unknown, config?: unknown) => apiClient.patch<T>(url, data, config as any);
export const del = <T = unknown>(url: string, config?: unknown) => apiClient.delete<T>(url, config as any);

export default apiClient;
