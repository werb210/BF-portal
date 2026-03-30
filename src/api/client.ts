import { apiFetch } from "@/lib/api";

type Options = RequestInit;

export const apiClient = {
  get: async <T = unknown>(path: string, options: Options = {}) => apiFetch(path, { ...options, method: "GET" }) as Promise<T>,
  post: async <T = unknown>(path: string, body?: unknown, options: Options = {}) =>
    apiFetch(path, { ...options, method: "POST", body: body instanceof FormData ? body : JSON.stringify(body) }) as Promise<T>,
  put: async <T = unknown>(path: string, body?: unknown, options: Options = {}) =>
    apiFetch(path, { ...options, method: "PUT", body: body instanceof FormData ? body : JSON.stringify(body) }) as Promise<T>,
  patch: async <T = unknown>(path: string, body?: unknown, options: Options = {}) =>
    apiFetch(path, { ...options, method: "PATCH", body: body instanceof FormData ? body : JSON.stringify(body) }) as Promise<T>,
  delete: async <T = unknown>(path: string, options: Options = {}) => apiFetch(path, { ...options, method: "DELETE" }) as Promise<T>,
};

export const { get, post, patch, delete: remove } = apiClient;

export default apiClient;
