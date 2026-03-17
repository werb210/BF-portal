import { apiClient } from "@/lib/apiClient";

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");

  if (token) {
    config.headers = {
      ...(config.headers as Record<string, string> | undefined),
      Authorization: `Bearer ${token}`
    } as any;
  }

  return config;
});

apiClient.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        return Promise.reject(err);
      }

      localStorage.removeItem("auth_token");
      window.location.href = "/login";
    }

    return Promise.reject(err);
  }
);

export const clientApi = apiClient;
export { apiClient };

export async function otpStart(payload: { phone: string }) {
  return apiClient.post("/api/auth/otp/start", payload);
}

export async function otpVerify(payload: { phone: string; code: string }) {
  return apiClient.post("/api/auth/otp/verify", payload);
}

export default apiClient;
