import { API_BASE } from "@/config/env";
import { assertObject } from "@/lib/validators";

let token: string | null = null;

const TOKEN_KEY = "token";
const DEFAULT_TIMEOUT = 10000;

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

function withTimeout(signal: AbortSignal | undefined, timeout: number) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener("abort", () => controller.abort(), { once: true });
    }
  }

  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(id),
  };
}

async function retryRequest(fn: () => Promise<Response>, retries = 2) {
  let attempt = 0;

  while (attempt <= retries) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
      attempt++;
    }
  }

  throw new Error("UNREACHABLE");
}

function generateRequestId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export type ApiRequestOptions = RequestInit & { timeout?: number };

export async function apiRequest<T = unknown>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  validatePath(path);

  const requestId = generateRequestId();
  const { timeout = DEFAULT_TIMEOUT, signal: inputSignal, ...requestOptions } = options;

  const requestHeaders = new Headers(requestOptions.headers);
  requestHeaders.set("X-Request-Id", requestId);

  if (!(requestOptions.body instanceof FormData) && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (!path.startsWith("/api/public/")) {
    const currentToken = getToken();

    if (!currentToken) {
      throw new Error("AUTH_REQUIRED");
    }

    requestHeaders.set("Authorization", `Bearer ${currentToken}`);
  }

  const { signal, cleanup } = withTimeout(inputSignal, timeout);

  try {
    const res = await retryRequest(() =>
      fetch(path, {
        ...requestOptions,
        credentials: undefined,
        headers: requestHeaders,
        signal,
      }),
    );

    if (res.status === 401) {
      setToken(null);
      if (isBrowser) {
        window.location.href = "/login";
      }
      throw new Error("UNAUTHORIZED");
    }

    if (res.status === 204) {
      return null as T;
    }

    if (!res.ok) {
      throw new Error(`API_ERROR_${res.status}`);
    }

    const raw = await res.text();

    let data: T;
    try {
      data = JSON.parse(raw) as T;
    } catch {
      throw new Error("INVALID_RESPONSE");
    }

    assertObject(data);

    return data;
  } finally {
    cleanup();
  }
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
