import apiClient from "../core/apiClient";
import { clearToken, setToken } from "@/lib/auth";
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

type WrappedApiResponse<T> = {
  ok: boolean;
  data?: T;
  error?: string;
};

const asErrorMessage = (payload: unknown): string | null => {
  if (!payload || typeof payload !== "object") return null;
  const error = (payload as { error?: unknown }).error;
  if (typeof error === "string" && error.trim()) return error;
  const message = (payload as { message?: unknown }).message;
  if (typeof message === "string" && message.trim()) return message;
  return null;
};

export async function startOtp(payload: { phone: string }) {
  const phone = normalizePhone(payload.phone);
  const response = await apiClient.post<WrappedApiResponse<{ sent?: boolean }>>(
    "/auth/otp/start",
    { phone },
    { headers: { "Content-Type": "application/json" } }
  );

  const payloadData = response?.data;
  if (!payloadData?.ok) {
    throw new Error(asErrorMessage(payloadData) ?? "Failed to send verification code");
  }

  if (!payloadData.data || payloadData.data.sent !== true) {
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

  const verify = await apiClient.post<WrappedApiResponse<OtpVerifyData>>(
    "/auth/otp/verify",
    { phone: normalizedPhone, code },
    { headers: { "Content-Type": "application/json" } }
  );

  const response = verify?.data;

  if (!response?.ok) {
    throw new Error(asErrorMessage(response) ?? "Authentication failed");
  }

  if (!response.data) {
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
