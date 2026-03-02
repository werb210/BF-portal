import axios from "axios";
import { ENV } from "@/config/env";
import { getStoredAccessToken } from "@/services/token";
import { getRequestId } from "@/api/requestId";

let lastUnauthorizedUrl: string | null = null;

export const api = axios.create({
  baseURL: ENV.API_BASE_URL,
  withCredentials: true
});

api.interceptors.request.use((config) => {
  if (process.env.NODE_ENV === "test") {
    config.baseURL = "http://localhost";
  }

  if (typeof config.url === "string" && config.url.startsWith("/") && !config.url.startsWith("/api/")) {
    config.url = `/api${config.url}`;
  }


  const token = localStorage.getItem("token") || localStorage.getItem("accessToken") || getStoredAccessToken();
  config.headers = config.headers ?? {};
  config.headers["X-Request-Id"] = getRequestId();

  if (token) {
    config.headers = {
      ...(config.headers as Record<string, string>),
      Authorization: `Bearer ${token}`
    } as any;
  }

  return config;
});

api.interceptors.response.use(
  (res) => {
    if (res?.config?.url === lastUnauthorizedUrl) {
      return Promise.reject({ status: 401, message: "Unauthorized" });
    }
    return res;
  },
  (err) => {
    if (!err.response) {
      console.error("Network error:", err);
      return Promise.reject({
        status: 0,
        message: err?.message ?? "Network error"
      });
    }

    if (err?.response?.status === 401) {
      lastUnauthorizedUrl = err.config?.url ?? null;
    }

    console.error("API error:", err.response.status);
    return Promise.reject({
      status: err.response.status,
      message: (err.response.data as { message?: string } | undefined)?.message ?? err.message ?? "Request failed",
      data: err.response.data
    });
  }
);

export async function apiFetch(input: RequestInfo, init: RequestInit = {}) {
  const requestId = getRequestId();

  const response = await fetch(input, {
    ...init,
    headers: {
      ...(init.headers || {}),
      "X-Request-Id": requestId,
      "Content-Type": "application/json"
    }
  });

  if (response.status === 401) {
    window.location.href = "/login";
  }

  return response;
}

export const clientApi = api;
export const otpStart = (payload: { phone: string }) => api.post("/auth/otp/start", payload);
export const otpVerify = (payload: { phone: string; code: string }) => api.post("/auth/otp/verify", payload);

export default api;
