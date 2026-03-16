import api from "../core/apiClient";
import { clearToken, setToken } from "@/auth/tokenStorage";
import { apiFetch } from "@/lib/api";
import { normalizePhone } from "../utils/normalizePhone";
import { ENV } from "@/config/env";

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

export async function verifyOtp(payload: { phone: string; code: string }) {
  const normalizedPayload = {
    phone: normalizePhone(payload.phone),
    code: payload.code
  };
  const res = await api.post("/api/auth/otp/verify", normalizedPayload);
  const data = res?.data ?? {};
  console.log("OTP_VERIFY_RESPONSE", data);
  const authPayload = (data.auth ?? {}) as Record<string, unknown>;
  const token =
    (data.accessToken as string | undefined) ??
    (data.sessionToken as string | undefined) ??
    (data.token as string | undefined) ??
    (authPayload.accessToken as string | undefined) ??
    (authPayload.sessionToken as string | undefined) ??
    (authPayload.token as string | undefined);

  if (token) {
    setToken(token);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("access_token", token);
      window.sessionStorage.setItem(ENV.JWT_STORAGE_KEY, token);
    }
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  }

  return {
    ...data,
    accessToken: token,
    sessionToken: (data.sessionToken as string | undefined) ?? (authPayload.sessionToken as string | undefined),
    user: (data.user as AuthenticatedUser | undefined) ?? (authPayload.user as AuthenticatedUser | undefined),
  };
}

export function logout() {
  clearToken();
  if (typeof window !== "undefined") {
    window.localStorage.removeItem("access_token");
  }
  delete api.defaults.headers.common.Authorization;
}


export async function getCurrentUser() {
  const res = await api.get("/api/auth/me");
  return res?.data ?? null;
}
