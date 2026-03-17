import { clearToken } from "@/auth/tokenStorage";
import { apiClient } from "@/lib/apiClient";

const token = localStorage.getItem("auth_token");

if (token) {
  apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
}

apiClient.interceptors.request.use((config) => {
  const currentToken = localStorage.getItem("auth_token");

  if (currentToken) {
    config.headers = config.headers ?? {};
    (config.headers as Record<string, string>).Authorization = `Bearer ${currentToken}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      const currentToken = localStorage.getItem("auth_token");

      if (!currentToken) {
        return Promise.reject(error);
      }

      localStorage.removeItem("auth_token");
      clearToken();
      delete apiClient.defaults.headers.common.Authorization;
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export default apiClient;
