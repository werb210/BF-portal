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

  return apiFetch("/api/auth/otp/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone })
  });
}

export async function verifyOtp(phone: string, code: string) {
  const normalizedPhone = normalizePhone(phone);

  console.log("OTP verify payload", { phone: normalizedPhone, code });

  const res = await apiClient.post("/api/auth/otp/verify", {
    phone: normalizedPhone,
    code
  });

  const data = res?.data;

  if (!data?.ok) {
    throw new Error(data?.error?.message || "Verification failed");
  }

  const payload = data?.data ?? data;

  return {
    accessToken: payload?.accessToken,
    sessionToken: payload?.sessionToken,
    role: payload?.role,
    user: payload?.user,
  };
}

export function logout() {
  clearToken();
  if (typeof window !== "undefined") {
    window.localStorage.removeItem("access_token");
  }
  delete apiClient.defaults.headers.common.Authorization;
}


export async function getCurrentUser() {
  const res = await apiClient.get("/api/auth/me");
  return res?.data ?? null;
}
