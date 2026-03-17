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

  const response = verify?.data;

  if (
    response?.ok === true &&
    response?.data &&
    (response.data.token || response.data.sessionToken) &&
    response.data.user
  ) {
    const token =
      response.data.token || response.data.sessionToken;

    localStorage.setItem("auth_token", token);

    return {
      success: true,
      nextPath: response.data.nextPath || "/portal"
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
