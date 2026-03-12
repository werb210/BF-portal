import axios, { AxiosError, AxiosInstance, type AxiosRequestConfig } from "axios";
import { getStoredAccessToken } from "@/services/token";
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

export function generateRequestId(): string {
  if (process.env.NODE_ENV === "test") {
    return "9dbc6d7b-b1c0-4dc8-896e-02a2e75c1826";
  }

  return crypto.randomUUID();
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

api.interceptors.request.use((config) => {
  config.url = normalizeApiRequestUrl(config.url);
  const requestId = generateRequestId();
  const token = getStoredAccessToken() ?? localStorage.getItem("token");
  const existingHeaders = (config.headers as Record<string, string> | undefined) ?? {};
  config.headers = {
    ...existingHeaders,
    "Content-Type": "application/json",
    "X-Request-Id": requestId,
  } as any;
  if (token && !config.headers?.Authorization) {
    config.headers = {
      ...(config.headers as Record<string, string> | undefined),
      Authorization: `Bearer ${token}`
    } as any;
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
  (error: AxiosError<{ message?: string; code?: string }>) => {
    const status = error.response?.status ?? 500;
    const data = error.response?.data;
    return Promise.reject(
      new ApiError({
        status,
        message: data?.message ?? error.message,
        code: data?.code,
        requestId: (error.response?.headers as Record<string, string> | undefined)?.["x-request-id"],
        details: data
      })
    );
  }
);

export default api;
