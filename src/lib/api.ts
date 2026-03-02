import axios, { AxiosError, AxiosInstance, type AxiosRequestConfig } from "axios";
import { getStoredAccessToken } from "@/services/token";
import { getRequestId } from "@/api/requestId";

function resolveBaseURL(): string {
  if (process.env.NODE_ENV === "test") {
    return "http://localhost/api";
  }

  if (import.meta.env?.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  return "/api";
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
  const requestId = getRequestId();
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
