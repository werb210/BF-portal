import apiClient from "../core/apiClient";
import { clearToken } from "@/auth/tokenStorage";
import { apiFetch } from "@/lib/api";
import { ApiError } from "@/api/http";
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

  const payload = verify?.data;
  const responseData = payload?.data;
  const token = typeof responseData?.token === "string" && responseData.token.trim().length > 0
    ? responseData.token
    : typeof responseData?.sessionToken === "string" && responseData.sessionToken.trim().length > 0
      ? responseData.sessionToken
      : null;
  const user = responseData?.user ?? null;

  const isVerificationSuccess =
    payload?.ok === true &&
    Boolean(responseData) &&
    Boolean(token) &&
    user !== null;

  if (!isVerificationSuccess) {
    const errorCode = payload?.error?.code;
    const errorMessage = payload?.error?.message ?? "Authentication failed. Request a new code.";
    throw new ApiError({
      status: 401,
      code: typeof errorCode === "string" ? errorCode : undefined,
      message: errorMessage,
      details: payload?.error
    });
  }

  localStorage.setItem("auth_token", token);

  if (user) {
    localStorage.setItem("auth_user", JSON.stringify(user));
  }

  return {
    token,
    user,
    nextPath: typeof responseData?.nextPath === "string" && responseData.nextPath.trim().length > 0
      ? responseData.nextPath
      : undefined
  };
}

export async function me() {
  return getCurrentUser();
}
