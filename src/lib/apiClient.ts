import { API_BASE } from "@/config/env";
import { getTokenOrFail } from "@/services/token";

export type ApiRequestOptions = RequestInit;

function normalizeHeaders(existing?: HeadersInit): Record<string, string> {
  const normalized: Record<string, string> = {};

  if (existing instanceof Headers) {
    existing.forEach((value, key) => {
      normalized[key] = value;
    });
    return normalized;
  }

  if (Array.isArray(existing)) {
    for (const [key, value] of existing) {
      normalized[key] = String(value);
    }
    return normalized;
  }

  if (existing) {
    Object.entries(existing).forEach(([key, value]) => {
      if (value != null) normalized[key] = String(value);
    });
  }

  return normalized;
}

export async function apiRequest<T = unknown>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  if (!path.startsWith("/api/")) {
    throw new Error("[INVALID PATH]");
  }

  if (!path.startsWith(API_BASE)) {
    throw new Error("[API BASE VIOLATION]");
  }

  const token = getTokenOrFail();
  const headers = normalizeHeaders(options.headers);

  headers["Content-Type"] = "application/json";
  headers.Authorization = `Bearer ${token}`;

  delete options.credentials;

  const res = await fetch(path, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "/login";
    throw new Error("[401]");
  }

  if (res.status === 204) {
    return null as T;
  }

  if (!res.ok) {
    throw new Error(`[${res.status}]`);
  }

  const text = await res.text();

  if (!text) {
    throw new Error("[EMPTY]");
  }

  return JSON.parse(text) as T;
}

export const apiFetch = apiRequest;

export type ApiOptions = ApiRequestOptions & { data?: unknown };

function normalizeBody(data: unknown, body: BodyInit | null | undefined) {
  if (data !== undefined) return data instanceof FormData ? data : JSON.stringify(data);
  return body;
}

const api = {
  get: <T = unknown>(path: string, options: ApiOptions = {}) => apiRequest<T>(path, { ...options, method: "GET" }),
  post: <T = unknown>(path: string, data?: unknown, options: ApiOptions = {}) =>
    apiRequest<T>(path, { ...options, method: "POST", body: normalizeBody(data, options.body) }),
  put: <T = unknown>(path: string, data?: unknown, options: ApiOptions = {}) =>
    apiRequest<T>(path, { ...options, method: "PUT", body: normalizeBody(data, options.body) }),
  patch: <T = unknown>(path: string, data?: unknown, options: ApiOptions = {}) =>
    apiRequest<T>(path, { ...options, method: "PATCH", body: normalizeBody(data, options.body) }),
  delete: <T = unknown>(path: string, options: ApiOptions = {}) => apiRequest<T>(path, { ...options, method: "DELETE" }),
};

export default api;
