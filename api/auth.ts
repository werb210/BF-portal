import { apiRequest } from "@/lib/api";

export async function startOtp(payload: { phone: string }) {
  return apiRequest<{ ok: boolean }>("/auth/otp/start", {
    method: "POST",
    body: { phone: payload.phone },
  });
}

export async function verifyOtp(payload: { phone: string; code: string }) {
  const res = await apiRequest<{ ok: boolean; token: string }>("/auth/otp/verify", {
    method: "POST",
    body: { phone: payload.phone, code: payload.code },
  });

  if (!res?.token) {
    throw new Error("Missing token");
  }

  localStorage.setItem("token", res.token);

  return res;
}
