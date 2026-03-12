import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "https://server.boreal.financial";

const API_TIMEOUT = 30000;

export function buildApiUrl(path: string) {
  if (!path) {
    return `${API_BASE_URL}/api`;
  }

  if (path.startsWith("http")) {
    return path;
  }

  let normalized = path;

  if (!normalized.startsWith("/")) {
    normalized = `/${normalized}`;
  }

  if (!normalized.startsWith("/api")) {
    normalized = `/api${normalized}`;
  }

  return `${API_BASE_URL}${normalized}`;
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
