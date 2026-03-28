import axios from "axios";

const API_BASE_URL = "https://server.boreal.financial";

const ensureApiPath = (url?: string) => {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/api/")) return url;
  if (url === "/api") return url;
  if (url.startsWith("/")) return `/api${url}`;
  return `/api/${url}`;
};

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");

  if (!token) {
    throw new Error("Missing auth token");
  }

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
  (res) => res,
  (err) => {
    console.error("PORTAL API ERROR:", err?.response || err.message);
    return Promise.reject(err);
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

  try {
    if (method === "GET") {
      const { data } = await api.get<T>(path, options);
      return data;
    }

    if (method === "DELETE") {
      const { data } = await api.delete<T>(path, options);
      return data;
    }

    if (method === "PATCH") {
      const { data } = await api.patch<T>(path, options.body ?? options.data, options);
      return data;
    }

    if (method === "PUT") {
      const { data } = await api.put<T>(path, options.body ?? options.data, options);
      return data;
    }

    const { data } = await api.post<T>(path, options.body ?? options.data, options);
    return data;
  } catch (error: any) {
    const status = error?.response?.status;
    const message = error?.response?.data?.error || error?.message || "Unknown API error";
    throw new ApiError(message, status);
  }
}

export async function safeApiFetch<T = unknown>(path: string, options: any = {}): Promise<T | null> {
  try {
    return await apiRequest<T>(path, options);
  } catch (error) {
    console.error("PORTAL API ERROR:", error);
    return null;
  }
}

export { api };
export default api;
