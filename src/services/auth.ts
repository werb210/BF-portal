import apiClient from "../core/apiClient";
import { clearToken, setToken } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { normalizePhone } from "../utils/normalizePhone";

export type AuthenticatedUser = {
  id?: string;
  email?: string;
  name?: string;
  role?: string;
  roles?: string[];
  capabilities?: string[];
};

export type OtpVerifyData = {
  token: string;
  user: AuthenticatedUser;
  nextPath?: string;
};

export async function startOtp(payload: { phone: string }) {
  const phone = normalizePhone(payload.phone);
  const response = await apiFetch<{ ok: boolean; data?: unknown }>("/auth/otp/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone })
  });

  if (!response?.ok) {
    throw new Error("Invalid API response");
  }

  return true;
}

export async function verifyOtp(phone: string, code: string) {
  const verified = await loginWithOtp(phone, code);

  return {
    user: verified.user,
    token: verified.token,
    nextPath: verified.nextPath ?? "/portal",
  };
}

export function logout() {
  clearToken();
  delete apiClient.defaults.headers.common.Authorization;
}

export async function getCurrentUser() {
  const res = await apiClient.get("/auth/me");
  const payload = res?.data;
  return payload?.data?.user ?? null;
}

export async function loginWithOtp(phone: string, code: string): Promise<OtpVerifyData> {
  const normalizedPhone = normalizePhone(phone);

  const verify = await apiClient.post<{ ok: boolean; data?: OtpVerifyData }>("/auth/otp/verify", {
    phone: normalizedPhone,
    code
  });

  const response = verify?.data;

  if (!response?.ok || !response?.data) {
    throw new Error("Invalid API response");
  }

  const { token, user, nextPath } = response.data;

  if (!token || !user) {
    throw new Error("Invalid API response");
  }

  setToken(token);

  return { token, user, nextPath };
}

export async function me() {
  return getCurrentUser();
}
