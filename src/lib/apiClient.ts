import { assertObject } from "@/lib/validators";
import { clearToken, getToken } from "@/services/token";

const DEFAULT_TIMEOUT = 10000;

const PUBLIC_PATHS = [
  "/api/public/",
  "/api/auth/",
]

function isPublicPath(path: string): boolean {
  return PUBLIC_PATHS.some((p) => path.startsWith(p))
}

export class ApiError extends Error {
  status?: number;
  details?: unknown;

  constructor(message: string, status?: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

function validatePath(path: string): void {
  if (!path.startsWith("/api/")) {
    throw new Error("INVALID_API_PATH");
  }
}

function fetchWithTimeout(signal: AbortSignal | undefined, timeout: number): { signal: AbortSignal; cleanup: () => void } {
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

async function retry(fn: () => Promise<Response>, retries = 2): Promise<Response> {
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

function createRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

type ApiRequestOptions = RequestInit & { timeout?: number };

export async function apiRequest<T = unknown>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  validatePath(path);

  const requestId = createRequestId();
  const { timeout = DEFAULT_TIMEOUT, signal: inputSignal, ...requestOptions } = options;
  const requestHeaders = new Headers(requestOptions.headers);
  const isPublic = isPublicPath(path);

  requestHeaders.set("X-Request-Id", requestId);

  if (!(requestOptions.body instanceof FormData) && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  const token = getToken();

  if (!isPublic && !token) {
    throw new Error("AUTH_REQUIRED");
  }

  if (token) {
    requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  const { signal, cleanup } = fetchWithTimeout(inputSignal, timeout);

  try {
    const res = await retry(() =>
      fetch(path, {
        ...requestOptions,
        credentials: undefined,
        headers: requestHeaders,
        signal,
      }),
    );

    if (res.status === 401) {
      clearToken();
      sessionStorage.removeItem("token");
      window.location.replace("/login");
      throw new Error("UNAUTHORIZED");
    }

    if (res.status === 204) {
      return null as T;
    }

    if (!res.ok) {
      let err = "API_ERROR";

      try {
        const json = await res.json();
        if (typeof json === "object" && json && "error" in json && typeof json.error === "string") {
          err = json.error;
        }
      } catch {}

      throw new Error(err);
    }

    let data: unknown;
    try {
      data = await res.json();
    } catch {
      throw new Error("INVALID_RESPONSE");
    }

    assertObject(data);

    return data as T;
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
