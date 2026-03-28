import axiosApi from "@/lib/api";

type Options = {
  headers?: HeadersInit;
  method?: string;
  signal?: AbortSignal;
  [key: string]: unknown;
};

const normalizeHeaders = (headers?: HeadersInit) => {
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
  return headers;
};

const toConfig = (options: Options = {}) => ({
  ...options,
  headers: normalizeHeaders(options.headers),
});

export const apiClient = {
  get: async <T = unknown>(path: string, options: Options = {}) => {
    const res = await axiosApi.get<T>(path, toConfig(options));
    return res.data;
  },
  post: async <T = unknown>(path: string, body?: unknown, options: Options = {}) => {
    const res = await axiosApi.post<T>(path, body, toConfig(options));
    return res.data;
  },
  put: async <T = unknown>(path: string, body?: unknown, options: Options = {}) => {
    const res = await axiosApi.put<T>(path, body, toConfig(options));
    return res.data;
  },
  patch: async <T = unknown>(path: string, body?: unknown, options: Options = {}) => {
    const res = await axiosApi.patch<T>(path, body, toConfig(options));
    return res.data;
  },
  delete: async <T = unknown>(path: string, options: Options = {}) => {
    const res = await axiosApi.delete<T>(path, toConfig(options));
    return res.data;
  },
};

export const { get, post, patch, delete: remove } = apiClient;

export default apiClient;
