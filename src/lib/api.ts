import axios, { type AxiosResponse } from "axios";
import { requireAuth } from "@/utils/requireAuth";

const API_BASE_URL = "https://server.boreal.financial";

const ensureApiPath = (url?: string) => {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/api/")) return url;
  if (url === "/api") return url;
  if (url.startsWith("/")) return `/api${url}`;
  return `/api/${url}`;
};

const validateResponse = <T>(response: AxiosResponse<T>) => {
  if (!response || typeof response.data === "undefined") {
    throw new Error("Invalid API response");
  }
  return response.data;
};

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = requireAuth();

  config.url = ensureApiPath(config.url);
  if (config.headers && typeof (config.headers as any).set === "function") {
    (config.headers as any).set("Authorization", `Bearer ${token}`);
  } else {
    config.headers = ({
      ...(config.headers as Record<string, string> | undefined),
      Authorization: `Bearer ${token}`,
    } as any);
  }

  return config;
});

api.interceptors.response.use(
  (response) => {
    validateResponse(response);
    return response;
  },
  (error) => {
    console.error("PORTAL API ERROR:", error?.response || error.message);
    return Promise.reject(error);
  }
);

export class ApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export const buildUrl = (path: string) => `${API_BASE_URL}${ensureApiPath(path)}`;

export async function apiRequest<T = unknown>(path: string, options: any = {}): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const payload = options.body ?? options.data;

  try {
    let response: AxiosResponse<T>;

    if (method === "GET") {
      response = await api.get<T>(path, options);
    } else if (method === "DELETE") {
      response = await api.delete<T>(path, options);
    } else if (method === "PATCH") {
      response = await api.patch<T>(path, payload, options);
    } else if (method === "PUT") {
      response = await api.put<T>(path, payload, options);
    } else {
      response = await api.post<T>(path, payload, options);
    }

    return validateResponse(response);
  } catch (error: any) {
    const status = error?.response?.status;
    const message = error?.response?.data?.error || error?.message || "Unknown API error";
    throw new ApiError(message, status);
  }
}

export async function safeApiFetch<T = unknown>(path: string, options: any = {}): Promise<T> {
  return apiRequest<T>(path, options);
}

export { api };
export default api;
