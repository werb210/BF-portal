import { z } from "zod";

import { decodeJwt } from "@/auth/jwt";
import { clearToken, getToken } from "@/auth/token";

const PUBLIC_PREFIXES = ["/api/auth", "/health", "/api/health"];
const REQUEST_TIMEOUT_MS = 8000;

const JsonValueSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(JsonValueSchema), z.record(JsonValueSchema)]),
);

type ApiFetchOptions = RequestInit & {
  schema?: z.ZodTypeAny;
};

function isPublic(url: string) {
  try {
    const resolved = new URL(url, window.location.origin);
    return PUBLIC_PREFIXES.some((prefix) => resolved.pathname.startsWith(prefix));
  } catch {
    return PUBLIC_PREFIXES.some((prefix) => url.startsWith(prefix));
  }
}

function isTokenValid(token: string) {
  if (!token.includes(".")) return true;

  const payload = decodeJwt(token);
  if (!payload) return false;
  if (!payload.exp) return true;

  const nowInSeconds = Math.floor(Date.now() / 1000);
  return payload.exp > nowInSeconds;
}

export async function apiFetch<T = unknown>(url: string, options: ApiFetchOptions = {}) {
  const { schema, ...requestOptions } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const token = getToken();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(requestOptions.headers || {}),
  };

  try {
    if (!isPublic(url)) {
      if (!token) throw new Error("AUTH_REQUIRED");
      if (!isTokenValid(token)) {
        clearToken();
        throw new Error("INVALID_TOKEN");
      }

      (headers as Record<string, string>).Authorization = `Bearer ${token}`;
    }

    const res = await fetch(url, {
      ...requestOptions,
      signal: controller.signal,
      headers,
    });

    if (res.status === 401) {
      clearToken();
      throw new Error("INVALID_TOKEN");
    }

    if (!res.ok) {
      throw new Error(`API error ${res.status}`);
    }

    if (res.status === 204) return null as T;

    const rawPayload = await res.text();
    const parsed = rawPayload ? JSON.parse(rawPayload) : {};
    const validator = schema ?? JsonValueSchema;
    return validator.parse(parsed) as T;
  } catch (err) {
    console.error("API FAILURE:", err);
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export const apiRequest = apiFetch;
export class ApiError extends Error {}

type ApiOptions = ApiFetchOptions & { data?: unknown };

function normalizeBody(data: unknown, body: BodyInit | null | undefined) {
  if (data !== undefined) return data instanceof FormData ? data : JSON.stringify(data);
  return body;
}

export const apiClient = {
  get: async <T = unknown>(path: string, options: ApiOptions = {}) => apiFetch<T>(path, { ...options, method: "GET" }),
  post: async <T = unknown>(path: string, body?: unknown, options: ApiOptions = {}) =>
    apiFetch<T>(path, { ...options, method: "POST", body: normalizeBody(body, options.body) }),
  put: async <T = unknown>(path: string, body?: unknown, options: ApiOptions = {}) =>
    apiFetch<T>(path, { ...options, method: "PUT", body: normalizeBody(body, options.body) }),
  patch: async <T = unknown>(path: string, body?: unknown, options: ApiOptions = {}) =>
    apiFetch<T>(path, { ...options, method: "PATCH", body: normalizeBody(body, options.body) }),
  delete: async <T = unknown>(path: string, options: ApiOptions = {}) => apiFetch<T>(path, { ...options, method: "DELETE" }),
};

const api = {
  get: apiClient.get,
  post: apiClient.post,
  put: apiClient.put,
  patch: apiClient.patch,
  delete: apiClient.delete,
};

export const { get, post, patch, delete: remove } = apiClient;

export default api;
