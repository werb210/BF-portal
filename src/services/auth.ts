import api from "../core/apiClient";
import { clearToken, setToken } from "@/auth/tokenStorage";
import { apiFetch } from "@/lib/api";
import { normalizePhone } from "@/utils/phone";

export type AuthenticatedUser = {
  id?: string;
  email?: string;
  name?: string;
  role?: string;
  roles?: string[];
  capabilities?: string[];
};

export async function startOtp(payload: { phone: string }) {
  const phone = normalizePhone(payload.phone);

  return apiFetch("/api/auth/otp/start", {
    method: "POST",
    body: JSON.stringify({ phone })
  });
}

export async function verifyOtp(payload: { phone: string; code: string }) {
  const normalizedPayload = {
    phone: normalizePhone(payload.phone),
    code: payload.code
  };
  const res = await api.post("/api/auth/otp/verify", normalizedPayload);
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
