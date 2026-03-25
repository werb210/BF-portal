import { apiFetch } from "@/lib/api";

export async function sendOtp(data: { phone: string }) {
  return apiFetch("/auth/otp/start", {
    method: "POST",
    body: data
  });
}

export async function verifyOtp(data: { phone: string; code: string }) {
  return apiFetch("/auth/otp/verify", {
    method: "POST",
    body: { phone: data.phone, code: data.code }
  });
}
