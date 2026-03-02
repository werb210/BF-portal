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
  refreshToken?: string;
  role?: string;
  error?: string;
};

export async function startOtp(payload: { phone: string }): Promise<OtpStartResult | null> {
  const response = await apiClient.post<OtpStartResponse>("/auth/otp/start", payload, {
    skipAuth: true,
    skipRequestId: true
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
    "/auth/otp/verify",
    { phone, code },
    {
      skipAuth: true,
      skipRequestId: true
    } as AuthRequestConfig
  );

  const response = {
    success: true as const,
    data: otpResponse.data
  };

  if (response.data?.error === "invalid_otp") {
    throw new Error("Verification failed");
  }

  if (!response.data?.accessToken) {
    throw new Error("Missing access token");
  }

  try {
    await apiRequest<{ id: string; role: string }>({
      method: "GET",
      url: "/auth/me",
      headers: { Authorization: `Bearer ${response.data.accessToken}` },
      withCredentials: false,
      skipAuth: true,
      skipRequestId: true
    });
  } catch {
    // Auth context will retry /auth/me; do not block OTP success on profile fetch.
  }

  return response.data;
}

export async function logout(): Promise<void> {
  const response = await apiClient.post("/auth/logout");
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
