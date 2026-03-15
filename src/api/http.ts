export { apiClient as api, apiClient as default } from "@/api/apiClient";
export { ApiError, type ApiErrorOptions } from "@/lib/api";

import { apiClient } from "@/api/apiClient";

export async function apiRequest<T>(config: { url?: string; method?: string; data?: unknown; headers?: Record<string, string> }) {
  const response = await apiClient.request<T>(config as any);
  return response.data;
}
