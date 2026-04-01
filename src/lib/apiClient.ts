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
  const base = (window as any).__API_BASE__ || import.meta.env.VITE_API_URL;
  if (!base) throw new Error("API_BASE_NOT_DEFINED");
  return base;
};

const withBody = (body: unknown): BodyInit | undefined => {
  if (body === undefined) return undefined;
  if (body instanceof FormData) return body;
  if (typeof body === "string") return body;
  return JSON.stringify(body);
};

const buildPath = (path: string, params?: ApiClientOptions["params"]): string => {
  if (!params) return path;
  const url = new URL(path, "http://localhost");
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

    if (!res.ok) throw new ApiError(`HTTP_ERROR_${res.status}`);
    const validated = await res.json();

    if (validated?.status === "ok") {
      setApiStatus("available");
      return validated.data as T;
    }

    const errorCode =
      typeof validated?.error === "string" ? validated.error : validated?.error?.code;
    if (errorCode === "DB_NOT_READY") {
      setApiStatus("degraded");
      return { degraded: true } as T;
    }

    const err = new Error(errorCode || "API_ERROR");
    (err as any).code = validated?.error?.code;
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
  const result = await apiFetch<T>(path, options);
  if (result.success || retries <= 0) return result;
  return apiFetchWithRetry<T>(path, options, retries - 1);
}

export const get = <T = unknown>(path: string, options: ApiClientOptions = {}) => apiClient<T>(path, { ...options, method: "GET" });
export const post = <T = unknown>(path: string, body?: unknown, options: ApiClientOptions = {}) =>
  apiClient<T>(path, { ...options, method: "POST", body });
export const apiPost = post;

const apiMethods = { get, post, patch: <T = unknown>(path: string, body?: unknown, options: ApiClientOptions = {}) => apiClient<T>(path, { ...options, method: "PATCH", body }), put: <T = unknown>(path: string, body?: unknown, options: ApiClientOptions = {}) => apiClient<T>(path, { ...options, method: "PUT", body }), delete: <T = unknown>(path: string, options: ApiClientOptions = {}) => apiClient<T>(path, { ...options, method: "DELETE" }) };

export default apiMethods;
