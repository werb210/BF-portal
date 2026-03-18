import { apiFetch } from "../lib/apiClient";
import { normalizePhone } from "@/utils/phone";

export async function startOtp(phone: string) {
  const normalizedPhone = normalizePhone(phone);

  const response = await apiFetch("/auth/otp/start", {
    method: "POST",
    body: JSON.stringify({ phone: normalizedPhone })
  });

  if (!response?.ok) {
    throw new Error("Invalid API response");
  }

  return true;
}

export const requestOtp = startOtp;

export async function verifyOtp(phone: string, code: string) {
  const normalizedPhone = normalizePhone(phone);

  const response = await apiFetch("/auth/otp/verify", {
    method: "POST",
    body: JSON.stringify({ phone: normalizedPhone, code })
  });

  if (!response?.ok || !response?.data) {
    throw new Error("Invalid API response");
  }

  return response.data;
}

export async function getCurrentUser() {
  return apiFetch("/auth/me");
}

export async function logout() {
  return apiFetch("/auth/logout", {
    method: "POST"
  });
}
