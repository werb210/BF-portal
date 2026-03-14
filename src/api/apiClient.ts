import axios from "axios";

declare global {
  interface Window {
    RUNTIME_CONFIG?: {
      API_BASE_URL?: string;
    };
  }
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || window.RUNTIME_CONFIG?.API_BASE_URL || "/api",
  withCredentials: true
});
