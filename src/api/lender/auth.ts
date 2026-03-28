import { lenderApiClient, type LenderAuthTokens } from "@/api/httpClient";
import type { UserRole } from "@/utils/roles";

export type LenderProfile = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyName?: string;
};

export type LenderLoginPayload = {
  email: string;
  password: string;
};

export type LenderLoginResponse = {
  otpRequestId: string;
  requiresOtp: boolean;
};

export const lenderLogin = (payload: LenderLoginPayload) =>
  lenderApiClient.post<LenderLoginResponse>(`/lender/auth/login`, payload, { skipAuth: true });

export const sendLenderOtp = (email: string) =>
  lenderApiClient.post(`/lender/auth/send-otp`, { email }, { skipAuth: true });

export type VerifyOtpPayload = {
  email: string;
  code: string;
  otpRequestId?: string;
};

export type VerifyOtpResponse = {
  accessToken: string;
  refreshToken: string;
  user: LenderProfile;
};

export const verifyLenderOtp = (payload: VerifyOtpPayload) =>
  lenderApiClient.post<VerifyOtpResponse>(`/lender/auth/verify-otp`, payload, { skipAuth: true });

export const fetchLenderProfile = () => lenderApiClient.get<LenderProfile>(`/lender/auth/me`);

export type LenderAuthResult = VerifyOtpResponse & { tokens: LenderAuthTokens };
