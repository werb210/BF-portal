import { apiClient } from "@/api/apiClient";
import clientApi from "@/api/client";
import { apiRequest, ApiError } from "@/lib/api";
import type { AuthRequestConfig } from "@/lib/api";

import type { BusinessUnit } from "@/types/businessUnit";

export interface AuthUser {
  id: string;
  role: string;
  silo: "BF" | "BI" | "SLF";
}

export type AuthenticatedUser = Record<string, any> &
  Partial<AuthUser> & {
    businessUnits?: BusinessUnit[];
    activeBusinessUnit?: BusinessUnit;
    silo?: BusinessUnit;
  };

export type OtpStartResponse =
  | {
      requestId?: string;
      twilioSid?: string;
      sid?: string;
    }
  | null;

export type OtpStartResult = {
  data: OtpStartResponse;
  headers: Record<string, string>;
};

export type OtpVerifyResponse = {
  accessToken?: string;
  token?: string;
  refreshToken?: string;
  role?: string;
  user?: AuthenticatedUser;
  error?: string;
};

export async function startOtp(payload: { phone: string }): Promise<OtpStartResult | null> {
  const response = await apiClient.post<OtpStartResponse>("/api/auth/otp/start", payload, {
    skipAuth: true
  });

  if (!response.success) {
    throw new ApiError({
      status: response.error.status ?? 500,
      message: response.error.message,
      code: response.error.code,
      requestId: response.error.requestId,
      details: response.error.details
    });
  }

  return {
    data: response.data ?? null,
    headers: {}
  };
}

export async function verifyOtp({
  phone,
  code
}: {
  phone: string;
  code: string;
}): Promise<OtpVerifyResponse> {
  const otpResponse = await clientApi.post<OtpVerifyResponse>(
    "/api/auth/otp/verify",
    { phone, code },
    {
      skipAuth: true
    } as AuthRequestConfig
  );

  const response = {
    success: true as const,
    data: otpResponse.data
  };

  if (response.data?.error === "invalid_otp") {
    throw new Error("Verification failed");
  }

  const accessToken = response.data?.accessToken || response.data?.token;
  const refreshToken = response.data?.refreshToken || null;

  if (!accessToken) {
    throw new Error("Missing access token");
  }

  try {
    await apiRequest<{ id: string; role: string }>({
      method: "GET",
      url: "/api/auth/me",
      headers: { Authorization: `Bearer ${accessToken}` },
      withCredentials: false,
      skipAuth: true
    });
  } catch {
    // Auth context will retry /auth/me; do not block OTP success on profile fetch.
  }

  return { ...response.data, accessToken, refreshToken };
}

export async function logout(): Promise<void> {
  const response = await apiClient.post("/api/auth/logout");
  if (!response.success) {
    throw new ApiError({
      status: response.error.status ?? 500,
      message: response.error.message,
      code: response.error.code,
      requestId: response.error.requestId,
      details: response.error.details
    });
  }
}
