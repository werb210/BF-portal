import axios from "axios";
import { normalizeApiBaseUrl } from "@/config/api";

declare global {
  interface Window {
    RUNTIME_CONFIG?: {
      API_BASE_URL?: string;
    };
  }
}

const runtimeBaseUrl =
  import.meta.env.VITE_API_URL ||
  window.RUNTIME_CONFIG?.API_BASE_URL ||
  "/api";

export const apiClient = axios.create({
  baseURL: normalizeApiBaseUrl(runtimeBaseUrl),
  withCredentials: true
});
