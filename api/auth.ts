import { api } from "@/lib/api";

export async function startOtp(payload: { phone: string }) {
  const res = await api.post("/api/auth/otp/start", payload);
  return res.data;
}

export async function verifyOtp(payload: { phone: string; code: string }) {
  const res = await api.post("/api/auth/otp/verify", payload);

  if (!res?.data?.token) {
    throw new Error("Missing token");
  }

  localStorage.setItem("auth_token", res.data.token);
  localStorage.setItem("token", res.data.token);
  localStorage.setItem("bf_token", res.data.token);

  return res.data;
}
