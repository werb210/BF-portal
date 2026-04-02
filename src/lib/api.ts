import { getEnv } from "../config/env";
import { getToken } from "../lib/authToken";
import { setApiStatus } from "../state/apiStatus";

export type RequestOptions = {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

export class ApiError extends Error {
  status?: number;
  details?: unknown;
}

const requiresAuth = (path: string) => !path.includes("/auth/") && !path.includes("/health");
const buildUrl = (path: string) => (/^https?:\/\//.test(path) ? path : `${getEnv().VITE_API_URL}${path}`);

export async function api<T = unknown>(path: string, options?: RequestOptions): Promise<T> {
  const token = getToken();

  if (requiresAuth(path) && !token) {
    throw new Error("MISSING_AUTH");
  }

  const res = await fetch(buildUrl(path), {
    method: options?.method || "GET",
    headers: {
      ...(options?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers ?? {}),
    },
    body:
      options?.body === undefined
        ? undefined
        : options.body instanceof FormData
          ? options.body
          : JSON.stringify(options.body),
    signal: options?.signal,
  });

  if (!res.ok) {
    const error = new ApiError(`HTTP_ERROR_${res.status}`);
    error.status = res.status;
    setApiStatus("unavailable");
    throw error;
  }

  const json: unknown = await res.json();

  if (!json || typeof json !== "object") {
    throw new Error("Invalid API response");
  }

  if (!("status" in json)) {
    console.error("MISSING STATUS FIELD:", json);
    throw new Error("Invalid API contract");
  }

  const typed = json as { status: string; data?: T; error?: string };

  if (typed.status !== "ok") {
    console.error("API ERROR RESPONSE:", json);
    throw new Error(typed.error || "API error");
  }

  setApiStatus("available");
  return typed.data as T;
}

export async function apiFetch<T = unknown>(path: string, options?: RequestOptions) {
  try {
    return { success: true as const, data: await api<T>(path, options) };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "API error" };
  }
}

export async function apiFetchWithRetry<T = unknown>(path: string, options?: RequestOptions, _retries = 0) {
  return apiFetch<T>(path, options);
}
