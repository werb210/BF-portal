import { API_BASE } from "@/config/env";

let token: string | null = null;

const TOKEN_KEY = "token";

const isBrowser = typeof window !== "undefined";

if (isBrowser && token === null) {
  const stored = window.localStorage.getItem(TOKEN_KEY);
  if (stored && stored.trim() !== "" && stored !== "undefined" && stored !== "null") {
    token = stored;
  }
}

export function setToken(nextToken: string | null) {
  token = nextToken && nextToken.trim() !== "" && nextToken !== "undefined" && nextToken !== "null" ? nextToken : null;

  if (!isBrowser) return;

  if (token) {
    window.localStorage.setItem(TOKEN_KEY, token);
    return;
  }

  window.localStorage.removeItem(TOKEN_KEY);
}

export function getToken(): string | null {
  if (isBrowser) {
    const stored = window.localStorage.getItem(TOKEN_KEY);
    if (stored && stored.trim() !== "" && stored !== "undefined" && stored !== "null") {
      token = stored;
    } else {
      token = null;
    }
  }

  return token;
}

export function getTokenOrFail(): string {
  const currentToken = getToken();

  if (!currentToken) {
    throw new Error("[AUTH BLOCK] INVALID TOKEN");
  }

  return currentToken;
}

function validatePath(path: string) {
  if (!path.startsWith("/api/")) {
    throw new Error("[INVALID PATH]");
  }

  if (!path.startsWith(API_BASE)) {
    throw new Error("[API BASE VIOLATION]");
  }

  if (path.includes("..") || path.includes("//") || path.includes("?")) {
    throw new Error("[MALFORMED PATH]");
  }
}

export type ApiRequestOptions = RequestInit;

export async function apiRequest<T = unknown>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  validatePath(path);

  const currentToken = getTokenOrFail();
  const requestHeaders = new Headers(options.headers);
  requestHeaders.set("Authorization", `Bearer ${currentToken}`);

  if (!(options.body instanceof FormData) && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  const res = await fetch(path, {
    ...options,
    credentials: undefined,
    headers: requestHeaders,
  });

  if (res.status === 401) {
    setToken(null);
    if (isBrowser) {
      window.location.href = "/login";
    }
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
