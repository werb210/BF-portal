import type { AxiosRequestConfig } from "axios";
import { apiClient as canonicalClient } from "@/api/client";

export type RequestOptions = AxiosRequestConfig & {
  skipAuth?: boolean;
};

export type ListResponse<T> = {
  items: T[];
} & Record<string, unknown>;

const readToken = () => localStorage.getItem("accessToken") || localStorage.getItem("token");

const withAuthHeaders = (options?: RequestOptions) => {
  if (options?.skipAuth) return options;
  const token = readToken();
  if (!token) return options;
  return {
    ...options,
    headers: {
      ...(options?.headers ?? {}),
      Authorization: `Bearer ${token}`
    }
  };
};

const unwrap = async <T>(request: Promise<{ data: T }>) => (await request).data;

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) => unwrap(canonicalClient.get<T>(path, withAuthHeaders(options))),
  post: <T>(path: string, data?: unknown, options?: RequestOptions) => unwrap(canonicalClient.post<T>(path, data, withAuthHeaders(options))),
  put: <T>(path: string, data?: unknown, options?: RequestOptions) => unwrap(canonicalClient.put<T>(path, data, withAuthHeaders(options))),
  patch: <T>(path: string, data?: unknown, options?: RequestOptions) => unwrap(canonicalClient.patch<T>(path, data, withAuthHeaders(options))),
  delete: <T>(path: string, options?: RequestOptions) => unwrap(canonicalClient.delete<T>(path, withAuthHeaders(options))),
  getList: <T>(path: string, options?: RequestOptions) => unwrap(canonicalClient.get<ListResponse<T>>(path, withAuthHeaders(options)))
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

const lenderHeaders = (options?: RequestOptions) => {
  if (options?.skipAuth) return options;
  const tokens = lenderAuthConfig.tokenProvider();
  if (!tokens?.accessToken) return options;
  return {
    ...options,
    headers: {
      ...(options?.headers ?? {}),
      Authorization: `Bearer ${tokens.accessToken}`
    }
  };
};

export const lenderApiClient = {
  get: <T>(path: string, options?: RequestOptions) => unwrap(canonicalClient.get<T>(path, lenderHeaders(options))),
  post: <T>(path: string, data?: unknown, options?: RequestOptions) => unwrap(canonicalClient.post<T>(path, data, lenderHeaders(options))),
  put: <T>(path: string, data?: unknown, options?: RequestOptions) => unwrap(canonicalClient.put<T>(path, data, lenderHeaders(options))),
  patch: <T>(path: string, data?: unknown, options?: RequestOptions) => unwrap(canonicalClient.patch<T>(path, data, lenderHeaders(options))),
  delete: <T>(path: string, options?: RequestOptions) => unwrap(canonicalClient.delete<T>(path, lenderHeaders(options))),
  getList: <T>(path: string, options?: RequestOptions) => unwrap(canonicalClient.get<ListResponse<T>>(path, lenderHeaders(options)))
};
