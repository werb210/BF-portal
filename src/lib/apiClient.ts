import axios from "axios";
import { API_BASE } from "../config/apiBase";

const API_TIMEOUT = 30000;

function normalizeBase(base: string): string {
  return (base || "").replace(/\/$/, "");
}

const API_BASE_URL = normalizeBase(API_BASE);

export function buildApiUrl(path: string) {
  if (!path) {
    return API_BASE_URL;
  }

  if (path.startsWith("http")) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(buildApiUrl(path), {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }

  const type = res.headers.get("content-type");
  if (type && type.includes("application/json")) {
    return res.json();
  }

  return res.text();
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json"
  }
});

apiClient.interceptors.request.use((config) => {
  if (typeof config.url === "string") {
    config.url = buildApiUrl(config.url);
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("Portal API error:", error?.response || error);
    return Promise.reject(error);
  }
);

export default apiClient;
