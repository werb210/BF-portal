import { apiClient } from "@/lib/api";

export function sendOtp(phone: string) {
  return apiClient("/auth/send-otp", {
    method: "POST",
    body: { phone },
  });
}

export function verifyOtp(phone: string, code: string) {
  return apiClient("/auth/verify-otp", {
    method: "POST",
    body: { phone, code },
  });
}
