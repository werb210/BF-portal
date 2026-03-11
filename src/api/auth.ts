import api, { otpStart, otpVerify } from "./client";
import type { AuthenticatedUser } from "@/services/auth";

export { otpStart as startOtp } from "./client";

export async function verifyOtp(phone: string, code: string) {
  const res = await otpVerify({ phone, code });
  return res.data;
}

export const fetchCurrentUser = () => api.get<AuthenticatedUser>("/api/auth/me");

export const logout = () => api.post<void>("/api/auth/logout");
