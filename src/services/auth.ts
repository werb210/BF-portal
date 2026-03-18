import apiClient from "../core/apiClient";
import { clearToken } from "@/auth/tokenStorage";
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

export async function startOtp(payload: { phone: string }) {
  const phone = normalizePhone(payload.phone);

  return apiFetch("/auth/otp/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone })
  });
}

export async function verifyOtp(phone: string, code: string) {
  const verified = await loginWithOtp(phone, code);
  if (!verified.success || !verified.user) {
    throw new Error(verified.error ?? "Verification failed");
  }

  return {
    user: verified.user,
    token: verified.token ?? null,
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
  return payload?.data?.user ?? payload?.user ?? payload ?? null;
}

export async function loginWithOtp(phone: string, code: string) {
  const normalizedPhone = normalizePhone(phone);

  const verify = await apiClient.post("/auth/otp/verify", {
    phone: normalizedPhone,
    code
  });

  const response = verify?.data;

  const payload = response?.data;
  const token = payload?.token ?? null;
  const user = payload?.user ?? null;
  const isSuccessful = response?.ok === true && Boolean(token && user);

  if (isSuccessful) {
    localStorage.setItem("auth_token", token);

    return {
      success: true,
      token,
      user,
      nextPath: "/portal"
    };
  }

  return {
    success: false,
    error: response?.error?.message || "Authentication failed"
  };
}

export async function me() {
  return getCurrentUser();
}
