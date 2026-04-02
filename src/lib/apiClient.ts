import { getToken } from "@/auth/token";
import { setApiStatus } from "@/state/apiStatus";

export type ApiClientOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  skipAuth?: boolean;
  params?: Record<string, string | number | boolean | null | undefined>;
};

export type ApiResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };

export class ApiError extends Error {}
export type DegradedApiResponse = { degraded: true };

const getBase = (): string => {
  const mode = import.meta.env.MODE;
  const base = mode === "test" ? "http://localhost/api/v1" : import.meta.env.VITE_API_URL;

  if (!base) throw new Error("MISSING_API_URL");
  if (!base.includes("/api/v1")) throw new Error("INVALID_API_VERSION");

  return base;
};

const withBody = (body: unknown): BodyInit | undefined => {
  if (body === undefined) return undefined;
  if (body instanceof FormData) return body;
  if (typeof body === "string") return body;
  return JSON.stringify(body);
};

const normalizeApiPath = (path: string): string => {
  const cleanPath = path.trim();
  if (/^https?:\/\//i.test(cleanPath)) {
    const url = new URL(cleanPath);
    return normalizeApiPath(`${url.pathname}${url.search}`);
  }
  if (cleanPath.startsWith("/api/v1/")) return cleanPath;
  if (cleanPath === "/api/v1") return "/api/v1";
  if (cleanPath.startsWith("/api/")) return `/api/v1/${cleanPath.slice("/api/".length)}`;
  if (cleanPath === "/api") return "/api/v1";
  if (cleanPath.startsWith("/")) return `/api/v1${cleanPath}`;
  return `/api/v1/${cleanPath}`;
};

const buildPath = (path: string, params?: ApiClientOptions["params"]): string => {
  const normalizedPath = normalizeApiPath(path);
  if (!params) return normalizedPath;
  const url = new URL(normalizedPath, "http://localhost");
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  });
  return `${url.pathname}${url.search}`;
};

const toHeaders = (options: ApiClientOptions = {}): HeadersInit => {
  const headers = new Headers(options.headers || {});
  if (!options.skipAuth) {
    const token = getToken();
    if (!token) throw new Error("MISSING_AUTH");
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return headers;
};

export async function api<T = unknown>(path: string, options: ApiClientOptions = {}): Promise<T> {
  const { body, params, ...rest } = options;
  const base = getBase().replace(/\/$/, "");
  const normalizedPath = buildPath(path, params).replace(/^\//, "");
  const originalFetch = window.fetch;

  try {
    const res = await originalFetch(`${base}/${normalizedPath}`, {
      ...rest,
      body: withBody(body),
      headers: toHeaders(options),
    });

    const payloadText = await res.text();
    const validated = payloadText ? JSON.parse(payloadText) : {};
    const errorCode =
      typeof validated?.error === "string"
        ? validated.error
        : typeof validated?.error?.code === "string"
          ? validated.error.code
          : typeof validated?.code === "string"
            ? validated.code
            : undefined;

    if (!res.ok) {
      const err = new ApiError(errorCode || `HTTP_ERROR_${res.status}`);
      (err as any).code = errorCode || `HTTP_ERROR_${res.status}`;
      (err as any).status = res.status;
      throw err;
    }

    if (validated?.status === "ok") {
      setApiStatus("available");
      return validated.data as T;
    }

    if (errorCode === "DB_NOT_READY") {
      setApiStatus("degraded");
      return { degraded: true } as T;
    }

    const err = new ApiError(errorCode || "API_ERROR");
    (err as any).code = errorCode || "API_ERROR";
    (err as any).status = res.status;
    throw err;
  } catch (e) {
    if (!(e instanceof Error && e.message === "MISSING_AUTH")) {
      setApiStatus("unavailable");
    }
    throw e;
  }
}

export const apiClient = api;

export async function apiFetch<T = unknown>(path: string, options: ApiClientOptions = {}): Promise<ApiResult<T>> {
  try {
    return { success: true, data: await api<T>(path, options) };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "API_ERROR" };
  }
}

export async function apiFetchWithRetry<T = unknown>(path: string, options: ApiClientOptions = {}, retries = 1): Promise<ApiResult<T>> {
  return apiFetch<T>(path, options);
}

export const get = <T = unknown>(path: string, options: ApiClientOptions = {}) => apiClient<T>(path, { ...options, method: "GET" });
export const post = <T = unknown>(path: string, body?: unknown, options: ApiClientOptions = {}) =>
  apiClient<T>(path, { ...options, method: "POST", body });
export const apiPost = post;

const apiMethods = { get, post, patch: <T = unknown>(path: string, body?: unknown, options: ApiClientOptions = {}) => apiClient<T>(path, { ...options, method: "PATCH", body }), put: <T = unknown>(path: string, body?: unknown, options: ApiClientOptions = {}) => apiClient<T>(path, { ...options, method: "PUT", body }), delete: <T = unknown>(path: string, options: ApiClientOptions = {}) => apiClient<T>(path, { ...options, method: "DELETE" }) };

export default apiMethods;
