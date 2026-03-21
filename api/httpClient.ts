import { apiFetch } from "@api/client";
import { reportAuthFailure } from "@/auth/authEvents";
import { ApiError } from "@api/http";
import { getRequestId } from "@/utils/requestId";
import { getStoredAccessToken } from "@/services/token";

export type RequestOptions = RequestInit & {
  skipAuth?: boolean;
};

export type ListResponse<T> = {
  items: T[];
} & Record<string, unknown>;

const readToken = () => getStoredAccessToken();

const isWriteMethod = (method?: string) => {
  const normalized = (method || "").toUpperCase();
  return normalized === "POST" || normalized === "PUT" || normalized === "PATCH" || normalized === "DELETE";
};

const requiresAuth = (path: string) => {
  const protectedPrefixes = ["/secure", "/lenders", "/dashboard", "/pipeline", "/applications"];
  return protectedPrefixes.some((prefix) => path.startsWith(prefix));
};

const createApiError = (status: number, message: string, code?: string) =>
  new ApiError({ status, message, code, details: { code } });

const withHeaders = (method: string, options?: RequestOptions): HeadersInit => {
  const headers = new Headers(options?.headers ?? {});

  headers.set("X-Request-Id", getRequestId());

  if (isWriteMethod(method) && !headers.get("Idempotency-Key")) {
    headers.set("Idempotency-Key", globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`);
  }

  if (!options?.skipAuth) {
    const token = readToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  return headers;
};

const request = async <T>(method: string, path: string, data?: unknown, options?: RequestOptions): Promise<T> => {
  const token = readToken();

  if (!options?.skipAuth && requiresAuth(path) && !token) {
    reportAuthFailure("missing-token");
    throw createApiError(401, "Missing authentication token", "missing-token");
  }

  const response = await apiFetch(path, {
    ...options,
    method,
    headers: withHeaders(method, options),
    body: data === undefined ? undefined : JSON.stringify(data),
  });

  if (response.status >= 400) {
    if (response.status === 401) {
      reportAuthFailure("unauthorized");
      throw createApiError(401, "Unauthorized", "unauthorized");
    }
    if (response.status === 403) {
      reportAuthFailure("forbidden");
      throw createApiError(403, "Forbidden", "forbidden");
    }
    throw createApiError(response.status, "Request failed");
  }

  return (await response.json()) as T;
};

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) => request<T>("GET", path, undefined, options),
  post: <T>(path: string, data?: unknown, options?: RequestOptions) => request<T>("POST", path, data, options),
  put: <T>(path: string, data?: unknown, options?: RequestOptions) => request<T>("PUT", path, data, options),
  patch: <T>(path: string, data?: unknown, options?: RequestOptions) => request<T>("PATCH", path, data, options),
  delete: <T>(path: string, options?: RequestOptions) => request<T>("DELETE", path, undefined, options),
  getList: <T>(path: string, options?: RequestOptions) => request<ListResponse<T>>("GET", path, undefined, options)
};

export default apiClient;

export type LenderAuthTokens = {
  accessToken: string;
  refreshToken: string;
};

type LenderAuthConfig = {
  tokenProvider: () => LenderAuthTokens | null;
  onTokensUpdated?: (tokens: LenderAuthTokens | null) => void;
  onUnauthorized?: () => void;
};

let lenderAuthConfig: LenderAuthConfig = {
  tokenProvider: () => null
};

export const configureLenderApiClient = (config: LenderAuthConfig) => {
  lenderAuthConfig = config;
};

const lenderHeaders = (method: string, options?: RequestOptions) => {
  const headers = new Headers(options?.headers ?? {});
  headers.set("X-Request-Id", getRequestId());

  if (isWriteMethod(method) && !headers.get("Idempotency-Key")) {
    headers.set("Idempotency-Key", globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`);
  }

  if (!options?.skipAuth) {
    const tokens = lenderAuthConfig.tokenProvider();
    if (tokens?.accessToken) {
      headers.set("Authorization", `Bearer ${tokens.accessToken}`);
    }
  }

  return headers;
};

const lenderRequest = async <T>(method: string, path: string, data?: unknown, options?: RequestOptions): Promise<T> => {
  const response = await apiFetch(path, {
    ...options,
    method,
    headers: lenderHeaders(method, options),
    body: data === undefined ? undefined : JSON.stringify(data)
  });

  if (response.status >= 400) {
    if (response.status === 401) {
      lenderAuthConfig.onUnauthorized?.();
      throw createApiError(401, "Unauthorized", "unauthorized");
    }
    throw createApiError(response.status, "Request failed");
  }

  return (await response.json()) as T;
};

export const lenderApiClient = {
  get: <T>(path: string, options?: RequestOptions) => lenderRequest<T>("GET", path, undefined, options),
  post: <T>(path: string, data?: unknown, options?: RequestOptions) => lenderRequest<T>("POST", path, data, options),
  put: <T>(path: string, data?: unknown, options?: RequestOptions) => lenderRequest<T>("PUT", path, data, options),
  patch: <T>(path: string, data?: unknown, options?: RequestOptions) => lenderRequest<T>("PATCH", path, data, options),
  delete: <T>(path: string, options?: RequestOptions) => lenderRequest<T>("DELETE", path, undefined, options),
  getList: <T>(path: string, options?: RequestOptions) => lenderRequest<ListResponse<T>>("GET", path, undefined, options)
};
