import axios from "axios";
import { reportError } from "@/utils/reportError";
import { showToast } from "../utils/toastEvents";
import { generateRequestId } from "./requestId";
import { clearToken } from "@/lib/auth";

export type ApiSilo = "bf" | "bi" | "slf" | "admin";

type RetryableRequestConfig = {
  _retry?: boolean;
};

export function createApi(silo: ApiSilo, token: string) {
  const baseMap: Record<ApiSilo, string> = {
    bf: import.meta.env.VITE_API_BF,
    bi: import.meta.env.VITE_API_BI,
    slf: import.meta.env.VITE_API_SLF,
    admin: import.meta.env.VITE_API_ADMIN ?? import.meta.env.VITE_API_BF
  };

  const instance = axios.create({
    baseURL: baseMap[silo]
  });

  instance.interceptors.request.use((config) => {
    const requestId = generateRequestId();

    config.headers = config.headers ?? {};
    if (requestId && requestId.trim().length > 0) {
      config.headers["x-request-id"] = requestId;
    } else {
      delete config.headers["x-request-id"];
    }

    if (token && token.trim().length > 0) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      delete config.headers.Authorization;
    }
    config.headers["x-silo"] = silo;
    return config;
  });

  const logout = () => {
    clearToken();
    window.location.href = "/login";
  };

  instance.interceptors.response.use(
    (res) => res,
    (err) => {
      reportError(err);
      const status = err.response?.status;
      const config = (err.config ?? {}) as RetryableRequestConfig;

      if (status === 401 && !config._retry) {
        config._retry = true;
        // future: call /refresh endpoint
        logout();
      }

      if (status === 403) {
        showToast("Access denied", "error");
      }

      if (status === 401) {
        logout();
      }

      return Promise.reject(err);
    }
  );

  return instance;
}
