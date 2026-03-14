import { apiFetch } from "../lib/apiClient";

export async function requestOtp(phone: string) {
  return apiFetch("/api/auth/otp/start", {
    method: "POST",
    body: JSON.stringify({ phone })
  });
}

export async function verifyOtp(code: string) {
  return apiFetch("/api/auth/otp/verify", {
    method: "POST",
    body: JSON.stringify({ code })
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
