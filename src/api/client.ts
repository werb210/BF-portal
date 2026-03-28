import { apiRequest } from "@/lib/api";

type Options = {
  auth?: boolean;
};

export const apiClient = {
  get: async <T = unknown>(path: string, options: Options = {}) =>
    apiRequest<T>("get", path, undefined, options.auth ?? true),
  post: async <T = unknown>(path: string, body?: unknown, options: Options = {}) =>
    apiRequest<T>("post", path, body, options.auth ?? true),
  put: async <T = unknown>(path: string, body?: unknown, options: Options = {}) =>
    apiRequest<T>("put", path, body, options.auth ?? true),
  patch: async <T = unknown>(path: string, body?: unknown, options: Options = {}) =>
    apiRequest<T>("patch", path, body, options.auth ?? true),
  delete: async <T = unknown>(path: string, options: Options = {}) =>
    apiRequest<T>("delete", path, undefined, options.auth ?? true),
};

export const { get, post, patch, delete: remove } = apiClient;

export default apiClient;
