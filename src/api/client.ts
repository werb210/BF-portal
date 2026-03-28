import { apiRequest } from "@/lib/api";

type Options = {
  headers?: HeadersInit;
  method?: string;
  signal?: AbortSignal;
  params?: Record<string, unknown>;
  responseType?: "blob" | "json" | "text" | "arraybuffer";
  [key: string]: unknown;
};

const normalizeHeaders = (headers?: HeadersInit): Record<string, string> | undefined => {
  if (!headers) return undefined;
  if (headers instanceof Headers) {
    const out: Record<string, string> = {};
    headers.forEach((value, key) => {
      out[key] = value;
    });
    return out;
  }
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }
  return headers as Record<string, string>;
};

const toConfig = (options: Options = {}) => ({
  ...options,
  headers: normalizeHeaders(options.headers),
});

export const apiClient = {
  get: async <T = unknown>(path: string, options: Options = {}) => apiRequest<T>(path, { ...toConfig(options), method: "GET" }),
  post: async <T = unknown>(path: string, body?: unknown, options: Options = {}) =>
    apiRequest<T>(path, { ...toConfig(options), method: "POST", body }),
  put: async <T = unknown>(path: string, body?: unknown, options: Options = {}) =>
    apiRequest<T>(path, { ...toConfig(options), method: "PUT", body }),
  patch: async <T = unknown>(path: string, body?: unknown, options: Options = {}) =>
    apiRequest<T>(path, { ...toConfig(options), method: "PATCH", body }),
  delete: async <T = unknown>(path: string, options: Options = {}) => apiRequest<T>(path, { ...toConfig(options), method: "DELETE" }),
};

export const { get, post, patch, delete: remove } = apiClient;

export default apiClient;
