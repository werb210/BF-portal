import { getEnv } from "@/config/env";

const API_BASE = getEnv().VITE_API_URL;

type RequestMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type ListResponse<T> = {
  items: T[];
} & Record<string, unknown>;

export type RequestOptions = {
  method?: RequestMethod;
  body?: unknown;
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean | null | undefined>;
  signal?: AbortSignal;
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

  const json = await res.json();

  if (json && typeof json === "object" && "status" in json) {
    const result = json as { status: string; error?: string; data?: T };
    if (result.status !== "ok") {
      throw new Error(result.error || "API error");
    }
    return result.data as T;
  }

  return json as T;
}

export const http = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "POST", body: body ?? options?.body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PUT", body: body ?? options?.body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PATCH", body: body ?? options?.body }),
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
