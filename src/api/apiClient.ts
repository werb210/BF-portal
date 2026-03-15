import axios from "axios";
import { getApiBase } from "@/config/apiBase";

function normalizeRequestPath(url?: string): string {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;

  const withLeadingSlash = url.startsWith("/") ? url : `/${url}`;
  return withLeadingSlash === "/api"
    ? "/"
    : withLeadingSlash.replace(/^\/api(?=\/|$)/, "");
}

const apiClient = axios.create({
  baseURL: getApiBase(),
  withCredentials: true
});

apiClient.interceptors.request.use((config) => ({
  ...config,
  url: normalizeRequestPath(config.url)
}));

export { apiClient };
export const get = <T = unknown>(url: string, config?: unknown) => apiClient.get<T>(url, config as any);
export const post = <T = unknown>(url: string, data?: unknown, config?: unknown) => apiClient.post<T>(url, data, config as any);
export const put = <T = unknown>(url: string, data?: unknown, config?: unknown) => apiClient.put<T>(url, data, config as any);
export const patch = <T = unknown>(url: string, data?: unknown, config?: unknown) => apiClient.patch<T>(url, data, config as any);
export const del = <T = unknown>(url: string, config?: unknown) => apiClient.delete<T>(url, config as any);

export default apiClient;
