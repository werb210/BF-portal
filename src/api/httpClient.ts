import { apiClient as baseClient } from "@/lib/apiClient";
import type { ApiResult } from "@/lib/apiClient";

export type RequestOptions = RequestInit & {
  skipAuth?: boolean;
};

export type ListResponse<T> = {
  items: T[];
} & Record<string, unknown>;

const request = async <T>(method: string, path: string, data?: unknown, options?: RequestOptions): Promise<ApiResult<T>> => {
  if (method === "GET") return baseClient.get<T>(path, options);
  if (method === "DELETE") return baseClient.delete<T>(path, options);
  if (method === "PATCH") return baseClient.patch<T>(path, data, options);
  if (method === "PUT") return baseClient.put<T>(path, data, options);
  return baseClient.post<T>(path, data, options);
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

export const configureLenderApiClient = (_config: LenderAuthConfig) => undefined;

export const lenderApiClient = apiClient;
