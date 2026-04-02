import { apiClient } from "@/lib/apiClient";

export type RequestOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean | null | undefined>;
  signal?: AbortSignal;
};

export type ListResponse<T> = {
  items: T[];
} & Record<string, unknown>;

export type LenderAuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export const http = apiClient;
export { apiClient };
export default apiClient;

export const configureLenderApiClient = (_config: {
  tokenProvider: () => LenderAuthTokens | null;
  onTokensUpdated?: (tokens: LenderAuthTokens | null) => void;
  onUnauthorized?: () => void;
}) => undefined;

export const lenderApiClient = apiClient;
