import { withApiBase } from "@/lib/apiBase";
import { safeFetch } from "@/lib/safeFetch";
import { startOtp as otpStart, verifyOtp as otpVerify, type AuthenticatedUser } from "@/services/auth";
import apiClient from "./client";

export { otpStart as startOtp };

export async function verifyOtp(phone: string, code: string) {
  return otpVerify({ phone, code });
}

export const fetchCurrentUser = () =>
  safeFetch<AuthenticatedUser>(withApiBase("/api/auth/me"), {
    credentials: "include"
  });

export const logout = () => apiClient.post<void>("/api/auth/logout");
