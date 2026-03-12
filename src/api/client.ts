import axios from "axios";
import { getToken } from "@/auth/tokenStorage";

const baseURL = process.env.NODE_ENV === "test" ? "http://localhost" : import.meta.env.VITE_API_BASE_URL;

const apiClient = axios.create({
  baseURL,
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = getToken();

  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export const clientApi = apiClient;
export { apiClient };

export async function otpStart(payload: { phone: string }) {
  return apiClient.post("/api/auth/otp/start", payload);
}

export async function otpVerify(payload: { phone: string; code: string }) {
  return apiClient.post("/api/auth/otp/verify", payload);
}

export default apiClient;
