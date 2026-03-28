import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { API_BASE_URL } from "@/config/api";

const AUTH_TOKEN_KEY = "auth_token";
const LEGACY_TOKEN_KEYS = ["bf_token", "token"] as const;

const readAuthToken = () => {
  const primary = localStorage.getItem(AUTH_TOKEN_KEY);
  if (primary) return primary;

  for (const key of LEGACY_TOKEN_KEYS) {
    const token = localStorage.getItem(key);
    if (token) return token;
  }

  return null;
};

const ensureApiPrefix = (url?: string) => {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/api/")) return url;
  if (url === "/api") return url;
  if (url.startsWith("/")) return `/api${url}`;
  return `/api/${url}`;
};

const normalizeOptions = (options: any = {}) => {
  const normalized = { ...options };
  if (normalized.body !== undefined && normalized.data === undefined) {
    normalized.data = normalized.body;
  }
  delete normalized.body;
  return normalized;
};

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = readAuthToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  config.url = ensureApiPrefix(config.url);

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      for (const key of LEGACY_TOKEN_KEYS) {
        localStorage.removeItem(key);
      }
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export const API_BASE = API_BASE_URL;

export class ApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function buildUrl(path: string): string {
  return `${API_BASE_URL}${ensureApiPrefix(path)}`;
}

export async function apiRequest<T = unknown>(path: string, options: any = {}): Promise<T> {
  try {
    const response = await api.request<T>({ url: path, ...normalizeOptions(options) });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const message =
        error.response?.data?.error ||
        error.message ||
        "Unknown API error";

      throw new ApiError(message, status);
    }

    throw new ApiError("Unexpected error", undefined);
  }
}

export async function safeApiFetch<T = unknown>(path: string, options: any = {}): Promise<T | null> {
  try {
    return await apiRequest<T>(path, options);
  } catch (error) {
    console.error("API Error:", error);
    return null;
  }
}

const client = {
  get: async <T = unknown>(path: string, options: any = {}) => {
    const res = await api.get<T>(path, normalizeOptions(options));
    return res.data;
  },
  post: async <T = unknown>(path: string, body?: unknown, options: any = {}) => {
    const res = await api.post<T>(path, body, normalizeOptions(options));
    return res.data;
  },
  put: async <T = unknown>(path: string, body?: unknown, options: any = {}) => {
    const res = await api.put<T>(path, body, normalizeOptions(options));
    return res.data;
  },
  patch: async <T = unknown>(path: string, body?: unknown, options: any = {}) => {
    const res = await api.patch<T>(path, body, normalizeOptions(options));
    return res.data;
  },
  delete: async <T = unknown>(path: string, options: any = {}) => {
    const res = await api.delete<T>(path, normalizeOptions(options));
    return res.data;
  },
  request: async <T = unknown>(options: any = {}) => {
    const res = await api.request<T>(normalizeOptions(options));
    return res.data;
  }
};

export default client;
