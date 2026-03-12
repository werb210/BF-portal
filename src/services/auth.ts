import api from "../core/apiClient";
import { clearToken, setToken } from "@/auth/tokenStorage";

export type AuthenticatedUser = {
  id?: string;
  email?: string;
  name?: string;
  role?: string;
  roles?: string[];
  capabilities?: string[];
};

export async function startOtp(payload: { phone: string }) {
  const res = await api.post("/api/auth/otp/start", payload);
  return res.data;
}

export async function verifyOtp(payload: { phone: string; code: string }) {
  const res = await api.post("/api/auth/otp/verify", payload);
  const data = res?.data ?? {};
  const token = data.accessToken ?? data.token;

  if (token) {
    setToken(token);
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  }

  return {
    ...data,
    accessToken: token,
  };
}

export function logout() {
  clearToken();
  delete api.defaults.headers.common.Authorization;
}
