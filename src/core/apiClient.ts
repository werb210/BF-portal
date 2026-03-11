import axios, { AxiosHeaders, type InternalAxiosRequestConfig } from "axios";
import { generateCorrelationId } from "./correlation";
import { getAccessToken } from "@/lib/authToken";
import { API_BASE_URL } from "@/lib/apiBase";

type ApiRequestConfig = InternalAxiosRequestConfig & {
  skipAuth?: boolean;
};

const api = axios.create({
  baseURL: API_BASE_URL
});

api.interceptors.request.use((config: ApiRequestConfig) => {
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
