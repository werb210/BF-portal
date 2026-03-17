import { apiClient } from "@/api/client";
import { apiUrl } from "@/config/api";

export { apiClient, apiClient as default, get, post, put, patch, del } from "@/api/client";

export function buildApiUrl(path: string) {
  return apiUrl(path);
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const method = (options.method || "GET").toUpperCase();
  if (method === "GET") {
    const response = await apiClient.get(path, { headers: options.headers as Record<string, string> | undefined });
    return response.data;
  }

  const response = await apiClient.request({
    url: path,
    method,
    data: options.body,
    headers: options.headers as Record<string, string> | undefined
  });
  return response.data;
}
