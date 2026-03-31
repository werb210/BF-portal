import { getTokenOrFail } from "@/lib/auth";

export type ApiRequestOptions = RequestInit;

function normalizeHeaders(existing?: HeadersInit) {
  const normalized: Record<string, string> = {};

  if (existing instanceof Headers) {
    existing.forEach((value, key) => {
      normalized[key] = value;
    });
  } else if (Array.isArray(existing)) {
    for (const [key, value] of existing) {
      normalized[key] = String(value);
    }
  } else if (existing) {
    Object.entries(existing).forEach(([key, value]) => {
      if (value != null) normalized[key] = String(value);
    });
  }

  return normalized;
}

export async function apiRequest<T = unknown>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  if (!path.startsWith("/api/")) {
    throw new Error("[INVALID API FORMAT]");
  }

  const token = getTokenOrFail();
  const headers = normalizeHeaders(options.headers);

  delete headers.Authorization;
  delete headers.authorization;

  headers.Authorization = `Bearer ${token}`;

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(path, {
    ...options,
    headers,
  });

  console.log("[REQ]", options.method || "GET", path);
  console.log("[STATUS]", res.status);

  if (res.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "/login";
    throw new Error("[AUTH FAIL]");
  }

  if (!res.ok) {
    throw new Error(`[API ERROR] ${res.status}`);
  }

  const text = await res.text();

  if (!text) {
    throw new Error("[EMPTY RESPONSE]");
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
