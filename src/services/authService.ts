import { apiFetch } from "../lib/apiClient";
import { normalizePhone } from "@/utils/phone";

export async function startOtp(phone: string) {
  const normalizedPhone = normalizePhone(phone);

  return apiFetch("/api/auth/otp/start", {
    method: "POST",
    body: JSON.stringify({ phone: normalizedPhone })
  });
}

export const requestOtp = startOtp;

export async function verifyOtp(phone: string, code: string) {
  const normalizedPhone = normalizePhone(phone);

  return apiFetch("/api/auth/otp/verify", {
    method: "POST",
    body: JSON.stringify({ phone: normalizedPhone, code })
  });
}

export async function getCurrentUser() {
  return apiFetch("/api/auth/me");
}

export async function logout() {
  return apiFetch("/api/auth/logout", {
    method: "POST"
  });
}
