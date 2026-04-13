import axios from "axios";
import { API_BASE } from "@/config/api";

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem("auth_token");
      window.location.assign("/login");
    }

    return Promise.reject(error);
  },
);

export async function apiFetch(path: string, options: RequestInit = {}): Promise<any> {
  const response = await api.request({
    url: path,
    method: options.method,
    data: options.body,
    headers: options.headers as Record<string, string> | undefined,
  });

  return response.data;
}

export default api;
