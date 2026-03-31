import { apiRequest } from "./client";

export function sendOtp(phone: string) {
  return apiRequest("/auth/send-otp", {
    method: "POST",
    body: { phone },
  });
}

export function verifyOtp(phone: string, code: string) {
  return apiRequest("/auth/verify-otp", {
    method: "POST",
    body: { phone, code },
  });
}
