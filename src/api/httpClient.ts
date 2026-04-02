import { ENV } from "@/config/env";

const API_BASE = ENV.API_URL;

type RequestMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type ListResponse<T> = {
  items: T[];
} & Record<string, unknown>;

export type RequestOptions = {
  method?: RequestMethod;
  body?: unknown;
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean | null | undefined>;
  data?: unknown;
  responseType?: "json" | "blob" | "text";
  signal?: AbortSignal;
  skipAuth?: boolean;
};

export async function request<T>(path: string, options?: RequestOptions): Promise<T> {
  const url = new URL(`${API_BASE}${path}`);
  Object.entries(options?.params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  });

  const res = await fetch(url.toString(), {
    method: options?.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
    signal: options?.signal,
  });

  if (options?.responseType === "blob") {
    return (await res.blob()) as T;
  }

  if (options?.responseType === "text") {
    return (await res.text()) as T;
  }

  const json = await res.json();

  if (json && typeof json === "object" && "success" in json) {
    if (!json.success) {
      throw new Error((json as { error?: string }).error || "API error");
    }
    return (json as { data: T }).data;
  }

  return json as T;
}

export const http = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "POST", body: body ?? options?.body ?? options?.data }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PUT", body: body ?? options?.body ?? options?.data }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PATCH", body: body ?? options?.body ?? options?.data }),
  delete: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: "DELETE" }),
  getList: <T>(path: string, options?: RequestOptions) => request<ListResponse<T>>(path, { ...options, method: "GET" }),
};

export const apiClient = http;
export default http;

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

export const lenderApiClient = http;
