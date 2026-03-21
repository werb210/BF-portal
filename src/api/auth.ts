import { apiFetch } from "./client";

export async function startOtp(payload: any) {
  return apiFetch("/auth/otp/start", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function verifyOtp(payload: any) {
  return apiFetch("/auth/otp/verify", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}
