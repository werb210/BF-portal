import { clearToken, getToken } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import { redirectToLogin } from "@/auth/redirectToLogin";

const token = getToken();

if (token) {
  apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
}

apiClient.interceptors.request.use((config) => {
  const currentToken = getToken();
  config.headers = config.headers ?? {};
  if (currentToken) {
    (config.headers as Record<string, string>).Authorization = `Bearer ${currentToken}`;
  } else {
    delete (config.headers as Record<string, string>).Authorization;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      const currentToken = getToken();

      if (!currentToken) {
        return Promise.reject(error);
      }

      clearToken();
      delete apiClient.defaults.headers.common.Authorization;
      redirectToLogin();
    }

    return Promise.reject(error);
  }
);

export default apiClient;
