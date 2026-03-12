import axios from "axios";
import { clearToken, getToken } from "@/auth/tokenStorage";

const API_BASE = import.meta.env.VITE_API_URL || "https://api.staff.boreal.financial";

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true
});

const token = getToken();

if (token) {
  api.defaults.headers.common.Authorization = `Bearer ${token}`;
}

api.interceptors.request.use((config) => {
  const token = getToken();

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearToken();
      delete api.defaults.headers.common.Authorization;
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export default api;
