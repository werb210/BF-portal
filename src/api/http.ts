import axios, { AxiosError, AxiosInstance, type AxiosRequestConfig } from "axios";
import { getStoredAccessToken } from "@/services/token";
import { getRequestId } from "@/api/requestId";
import toast from "react-hot-toast";
import { API_BASE_URL } from "@/lib/apiBase";

function resolveBaseURL(): string {
  if (process.env.NODE_ENV === "test") {
    return "http://localhost";
  }

  return API_BASE_URL;
}


function normalizeApiRequestUrl(url: AxiosRequestConfig["url"]): AxiosRequestConfig["url"] {
  if (!url || typeof url !== "string") return url;
  if (/^https?:\/\//i.test(url)) return url;

  const baseEndsWithApi = resolveBaseURL().endsWith("/api");
  const startsWithApi = url === "/api" || url.startsWith("/api/");
  if (baseEndsWithApi && startsWithApi) {
    const trimmed = url.replace(/^\/api/, "");
    return trimmed.length ? trimmed : "/";
  }

  return url;
}

function readToken(): string | null {
  // Backward compatible with both keys used across the repo.
  return getStoredAccessToken() || localStorage.getItem("token") || localStorage.getItem("accessToken") || null;
}

export type ApiErrorOptions = {
  status: number;
  message: string;
  code?: string;
  requestId?: string;
  details?: unknown;
};

export class ApiError extends Error {
  status: number;
  code?: string;
  requestId?: string;
  details?: unknown;

  constructor({ status, message, code, requestId, details }: ApiErrorOptions) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.requestId = requestId;
    this.details = details;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export type AuthRequestConfig = AxiosRequestConfig & {
  skipAuth?: boolean;
  skipRequestId?: boolean;
};

export const api: AxiosInstance = axios.create({
  baseURL: resolveBaseURL(),
  withCredentials: true,
});

// ✅ Attach bearer header for any consumer of this api instance (including tests).
api.interceptors.request.use((config) => {
  config.url = normalizeApiRequestUrl(config.url);
  const requestId = getRequestId();
  const existingHeaders = (config.headers as Record<string, string> | undefined) ?? {};
  const isFormData = typeof FormData !== "undefined" && config.data instanceof FormData;
  config.headers = {
    ...existingHeaders,
    "X-Request-Id": requestId,
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
  } as any;

  const token = readToken();
  const skipAuth = (config as AuthRequestConfig).skipAuth;

  if (!skipAuth && token) {
    config.headers = {
      ...(config.headers as Record<string, string>),
      Authorization: `Bearer ${token}`,
    } as any;
  }

  const method = config.method?.toUpperCase();
  if (!skipAuth && method && ["POST", "PATCH", "DELETE"].includes(method)) {
    const headers = (config.headers as Record<string, string>) ?? {};
    if (!headers["Idempotency-Key"]) {
      headers["Idempotency-Key"] = typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `idempotency_${Math.random().toString(36).slice(2, 10)}`;
      config.headers = headers as any;
    }
  }

  return config;
});

export async function apiRequest<T>(config: AxiosRequestConfig): Promise<T> {
  try {
    const response = await api.request<T>(config);
    return response.data as T;
  } catch (error: unknown) {
    const axiosError = error as AxiosError<{ message?: string; code?: string }>;
    const status = axiosError.response?.status ?? 500;
    const data = axiosError.response?.data;

    throw new ApiError({
      status,
      message: data?.message ?? axiosError.message,
      code: data?.code,
      requestId: (axiosError.response?.headers as Record<string, string> | undefined)?.["x-request-id"],
      details: data,
    });
  }
}

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (process.env.NODE_ENV === "test") {
      return Promise.reject(error);
    }
    toast.error(error.message || "Request failed");
    return Promise.reject(error);
  }
);

export default api;
