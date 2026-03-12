import apiClient from "./client";
import { startOtp as otpStart, verifyOtp as otpVerify, type AuthenticatedUser } from "@/services/auth";

export { otpStart as startOtp };

export async function verifyOtp(phone: string, code: string) {
  return otpVerify({ phone, code });
}

export const fetchCurrentUser = () => apiClient.get<AuthenticatedUser>("/api/auth/me");

export const logout = () => apiClient.post<void>("/api/auth/logout");
