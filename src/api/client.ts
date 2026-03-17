import axios from "axios";
import { getApiBase } from "@/config/apiBase";

const sanitizePath = (url: string) => {
  return url.replace("/api/" + "api/", "/api/");
};

const api = axios.create({
  baseURL: getApiBase(),
  timeout: 20000,
  withCredentials: true
});

api.interceptors.request.use((config) => {

  if (config.url) {
    config.url = sanitizePath(config.url);
  }

  const token = localStorage.getItem("auth_token");

  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }

  return config;

});

export const apiClient = api;
export const clientApi = api;
export const get = <T = unknown>(url: string, config?: unknown) => api.get<T>(url, config as any);
export const post = <T = unknown>(url: string, data?: unknown, config?: unknown) => api.post<T>(url, data, config as any);
export const put = <T = unknown>(url: string, data?: unknown, config?: unknown) => api.put<T>(url, data, config as any);
export const patch = <T = unknown>(url: string, data?: unknown, config?: unknown) => api.patch<T>(url, data, config as any);
export const del = <T = unknown>(url: string, config?: unknown) => api.delete<T>(url, config as any);

export default api;
