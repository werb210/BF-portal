import apiClient from "../core/apiClient";
import { clearToken, setToken } from "@/lib/auth";
import { normalizePhone } from "../utils/normalizePhone";

export type AuthenticatedUser = {
  id?: string;
  name?: string;
  email?: string;
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
  code?: string;
  message?: string;
};

const asErrorMessage = (payload: unknown): string | null => {
  if (!payload || typeof payload !== "object") return null;
  const error = (payload as { error?: unknown }).error;
  if (typeof error === "string" && error.trim()) return error;
  const message = (payload as { message?: unknown }).message;
  if (typeof message === "string" && message.trim()) return message;
  return null;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object";

const asWrappedPayload = <T>(payload: unknown): WrappedApiResponse<T> | null => {
  if (!isObject(payload)) return null;
  return payload as WrappedApiResponse<T>;
};

const resolvePayloadData = <T>(payload: unknown): T | null => {
  const wrapped = asWrappedPayload<T>(payload);
  if (wrapped) {
    if (wrapped.ok === false) return null;
    if (wrapped.data !== undefined) return wrapped.data;
  }

  if (!isObject(payload)) return null;
  return payload as T;
};

export async function startOtp(payload: { phone: string }) {
  const phone = normalizePhone(payload.phone);
  const response = await apiClient.post<WrappedApiResponse<{ sent?: boolean }>>(
    "/api/auth/otp/start",
    { phone },
    { headers: { "Content-Type": "application/json" } }
  );

  const payloadData = response?.data;
  const normalized = resolvePayloadData<{ sent?: boolean }>(payloadData);

  if (!normalized) {
    throw new Error(asErrorMessage(payloadData) ?? "Failed to send verification code");
  }

  if (normalized.sent !== true) {
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
  const res = await apiClient.get("/api/auth/me");
  const payload = res?.data as { user?: AuthenticatedUser; data?: { user?: AuthenticatedUser } } | null;
  return payload?.data?.user ?? payload?.user ?? (payload as AuthenticatedUser | null) ?? null;
}

export async function loginWithOtp(phone: string, code: string): Promise<OtpVerifyData> {
  const normalizedPhone = normalizePhone(phone);

  const verify = await apiClient.post<WrappedApiResponse<OtpVerifyData>>(
    "/api/auth/otp/verify",
    { phone: normalizedPhone, code },
    { headers: { "Content-Type": "application/json" } }
  );

  const response = verify?.data;
  const resolved = resolvePayloadData<OtpVerifyData>(response);
  if (!resolved) {
    throw new Error(asErrorMessage(response) ?? "Authentication failed");
  }

  const { token, user, nextPath } = resolved;

  if (!token || !user) {
    throw new Error("Invalid API response");
  }

  setToken(token);

  return { token, user, nextPath };
}

export async function me() {
  return getCurrentUser();
}
