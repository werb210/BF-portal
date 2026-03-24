import { apiRequest } from "@/lib/api";

export async function startOtp(payload: { phone: string }) {
  return apiRequest("/auth/otp/start", {
    method: "POST",
    body: JSON.stringify({ phone: payload.phone }),
  });
}

export async function verifyOtp(payload: { phone: string; code?: string; otp?: string }) {
  const otp = payload.otp ?? payload.code ?? "";
  const res = await apiRequest("/auth/otp/verify", {
    method: "POST",
    body: JSON.stringify({ phone: payload.phone, otp }),
  });

  if (!res?.token) {
    throw new Error("Missing token");
  }

  localStorage.setItem("token", res.token);

  return res;
}
