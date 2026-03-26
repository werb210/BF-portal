import { apiFetch } from "@/lib/apiFetch";

export async function startOtp(payload: { phone: string }) {
  return apiFetch<{ ok: boolean }>("/auth/otp/start", {
    method: "POST",
    body: JSON.stringify({ phone: payload.phone }),
  });
}

export async function verifyOtp(payload: { phone: string; code: string }) {
  const res = await apiFetch<{ ok: boolean; token: string }>("/auth/otp/verify", {
    method: "POST",
    body: JSON.stringify({ phone: payload.phone, code: payload.code }),
  });

  if (!res?.token) {
    throw new Error("Missing token");
  }

  localStorage.setItem("token", res.token);

  return res;
}
