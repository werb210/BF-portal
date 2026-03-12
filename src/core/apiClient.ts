import axios, { AxiosHeaders, type AxiosRequestConfig, type InternalAxiosRequestConfig } from "axios";
import { generateCorrelationId } from "./correlation";
import { getAccessToken } from "@/lib/authToken";
import { API_BASE_URL } from "@/lib/apiBase";

function normalizeApiRequestUrl(url: AxiosRequestConfig["url"]): AxiosRequestConfig["url"] {
  if (!url || typeof url !== "string") return url;
  if (/^https?:\/\//i.test(url)) return url;

  const baseEndsWithApi = API_BASE_URL.endsWith("/api");
  const startsWithApi = url === "/api" || url.startsWith("/api/");
  if (baseEndsWithApi && startsWithApi) {
    const trimmed = url.replace(/^\/api/, "");
    return trimmed.length ? trimmed : "/";
  }

  return url;
}

type ApiRequestConfig = InternalAxiosRequestConfig & {
  skipAuth?: boolean;
};

const api = axios.create({
  baseURL: API_BASE_URL
});

api.interceptors.request.use((config: ApiRequestConfig) => {
  config.url = normalizeApiRequestUrl(config.url);
  const headers = AxiosHeaders.from(config.headers ?? {});
  headers.set("X-Correlation-Id", generateCorrelationId());

  if (!config.skipAuth) {
    const token = getAccessToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  config.headers = headers;
  return config;
});

export default api;
