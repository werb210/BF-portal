import { apiFetch } from "@/lib/api";

export async function startOtp(phone: string) {
  return apiFetch("/auth/otp/start", {
    method: "POST",
    body: { phone },
  });
}

export async function verifyOtp(phone: string, code: string) {
  const result = await apiFetch("/auth/otp/verify", {
    method: "POST",
    body: { phone, code },
  });

  localStorage.setItem("token", result.token);
  return result;
}
