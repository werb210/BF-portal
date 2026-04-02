import { getToken } from "@/auth/token";
import { API_BASE } from "@/config/api";
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

const toBody = (body: unknown): BodyInit | undefined => {
  if (body === undefined) return undefined;
  if (body instanceof FormData) return body;
  if (typeof body === "string") return body;
  return JSON.stringify(body);
};

const normalizePath = (path: string): string => {
  const clean = path.trim();
  if (clean.startsWith("/api/v1")) return clean.slice("/api/v1".length) || "/";
  if (clean === "/api") return "/";
  if (clean.startsWith("/api/")) return clean.slice("/api".length);
  return clean.startsWith("/") ? clean : `/${clean}`;
};

const withParams = (path: string, params?: ApiClientOptions["params"]): string => {
  const url = new URL(`${API_BASE}${normalizePath(path)}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url.toString();
};

const toHeaders = (options: ApiClientOptions): Headers => {
  const headers = new Headers(options.headers ?? {});

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

  try {
    const res = await fetch(withParams(path, params), {
      ...rest,
      credentials: "include",
      headers: toHeaders(options),
      body: toBody(body),
    });

    if (!res.ok) {
      throw new ApiError(`HTTP_ERROR_${res.status}`);
    }

    const payload = await res.json();

    if (payload?.status === "ok") {
      setApiStatus("available");
      return payload.data as T;
    }

    if (payload?.error === "DB_NOT_READY" || payload?.error?.code === "DB_NOT_READY") {
      setApiStatus("degraded");
      return { degraded: true } as T;
    }

    if (payload && typeof payload === "object" && "success" in payload) {
      const result = payload as ApiResult<T>;
      if (result.success === false) {
        throw new ApiError(result.error || "API_ERROR");
      }
      return result.data;
    }

    return payload as T;
  } catch (error) {
    if (!(error instanceof Error && error.message === "MISSING_AUTH")) {
      setApiStatus("unavailable");
    }
    throw error;
  }
}

export async function apiFetch<T = unknown>(path: string, options: ApiClientOptions = {}): Promise<ApiResult<T>> {
  try {
    return { success: true, data: await api<T>(path, options) };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "API_ERROR" };
  }
}

export async function apiFetchWithRetry<T = unknown>(path: string, options: ApiClientOptions = {}): Promise<ApiResult<T>> {
  return apiFetch<T>(path, options);
}

export const get = <T = unknown>(path: string, options: ApiClientOptions = {}) => api<T>(path, { ...options, method: "GET" });
export const post = <T = unknown>(path: string, body?: unknown, options: ApiClientOptions = {}) =>
  api<T>(path, { ...options, method: "POST", body });
export const apiPost = post;

const apiMethods = {
  get,
  post,
  patch: <T = unknown>(path: string, body?: unknown, options: ApiClientOptions = {}) =>
    api<T>(path, { ...options, method: "PATCH", body }),
  put: <T = unknown>(path: string, body?: unknown, options: ApiClientOptions = {}) =>
    api<T>(path, { ...options, method: "PUT", body }),
  delete: <T = unknown>(path: string, options: ApiClientOptions = {}) => api<T>(path, { ...options, method: "DELETE" }),
};

export const apiClient = Object.assign(api, apiMethods);

export default apiMethods;
