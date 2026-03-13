import { clearToken, getToken } from "@/auth/tokenStorage";
import { apiClient } from "@/lib/apiClient";

const token = getToken();

if (token) {
  apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
}

apiClient.interceptors.request.use((config) => {
  const currentToken = getToken();

  if (currentToken) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${currentToken}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const requestUrl = String(error?.config?.url || "");
    const isAuthBootstrapRequest = requestUrl.includes("/api/auth/me");

    if (status === 401 && !isAuthBootstrapRequest) {
      clearToken();
      delete apiClient.defaults.headers.common.Authorization;
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export default apiClient;
