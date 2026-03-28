import api from "@/api/client";
import { reportAuthFailure } from "@/auth/authEvents";
import { ApiError } from "@/api/http";
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

  try {
    const requestOptions = { ...options, headers: withHeaders(method, options) };
    if (method === "GET") return await api.get<T>(path, requestOptions);
    if (method === "DELETE") return await api.delete<T>(path, requestOptions);
    if (method === "PATCH") return await api.patch<T>(path, data, requestOptions);
    return await api.post<T>(path, data, { ...requestOptions, method });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    const normalized = message.toLowerCase();
    if (normalized.includes("401") || normalized.includes("unauthorized")) {
      reportAuthFailure("unauthorized");
      throw createApiError(401, "Unauthorized", "unauthorized");
    }
    if (normalized.includes("403") || normalized.includes("forbidden")) {
      reportAuthFailure("forbidden");
      throw createApiError(403, "Forbidden", "forbidden");
    }
    throw createApiError(500, message);
  }
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
  try {
    const requestOptions = { ...options, headers: lenderHeaders(method, options) };
    if (method === "GET") return await api.get<T>(path, requestOptions);
    if (method === "DELETE") return await api.delete<T>(path, requestOptions);
    if (method === "PATCH") return await api.patch<T>(path, data, requestOptions);
    return await api.post<T>(path, data, { ...requestOptions, method });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    if (message.toLowerCase().includes("401") || message.toLowerCase().includes("unauthorized")) {
      lenderAuthConfig.onUnauthorized?.();
      throw createApiError(401, "Unauthorized", "unauthorized");
    }
    throw createApiError(500, message);
  }
};

export const lenderApiClient = {
  get: <T>(path: string, options?: RequestOptions) => lenderRequest<T>("GET", path, undefined, options),
  post: <T>(path: string, data?: unknown, options?: RequestOptions) => lenderRequest<T>("POST", path, data, options),
  put: <T>(path: string, data?: unknown, options?: RequestOptions) => lenderRequest<T>("PUT", path, data, options),
  patch: <T>(path: string, data?: unknown, options?: RequestOptions) => lenderRequest<T>("PATCH", path, data, options),
  delete: <T>(path: string, options?: RequestOptions) => lenderRequest<T>("DELETE", path, undefined, options),
  getList: <T>(path: string, options?: RequestOptions) => lenderRequest<ListResponse<T>>("GET", path, undefined, options)
};
