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
  const normalizedPhone = normalizePhone(phone);

  console.log("OTP verify payload", { phone: normalizedPhone, code });

  const res = await apiClient.post("/auth/otp/verify", {
    phone: normalizedPhone,
    code
  });

  const data = res?.data;

  if (!data?.ok) {
    throw new Error(data?.error?.message || "Verification failed");
  }

  const payload = data?.data ?? data;

  const token = payload?.accessToken ?? payload?.sessionToken ?? null;

  if (token) {
    localStorage.setItem("auth_token", token);
  }

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
  const res = await apiClient.get("/auth/me");
  return res?.data ?? null;
}

export async function loginWithOtp(phone: string, code: string) {
  const normalizedPhone = normalizePhone(phone);

  const verify = await apiClient.post("/auth/otp/verify", {
    phone: normalizedPhone,
    code
  });

  const otpToken = verify.data?.token;

  if (!otpToken) {
    throw new Error("OTP verification failed");
  }

  localStorage.setItem("otp_token", otpToken);

  const session = await apiClient.get("/continuation/session", {
    headers: {
      Authorization: `Bearer ${otpToken}`
    }
  });

  const authToken = session.data?.token;
  const user = session.data?.user;

  if (!authToken) {
    throw new Error("Session exchange failed");
  }

  localStorage.removeItem("otp_token");
  localStorage.setItem("auth_token", authToken);

  return user;
}

export async function me() {
  return getCurrentUser();
}
