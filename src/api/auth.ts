import { api } from "@/lib/api";
import { setToken } from "@/auth/tokenStorage";

export async function startOtp(payload: { phone: string }) {
  const res = await api.post("/api/auth/otp/start", payload);

  if (!res || typeof res.data === "undefined") {
    throw new Error("Invalid API response");
  }

  return res.data;
}

export async function verifyOtp(payload: { phone: string; code: string }) {
  const res = await api.post("/api/auth/otp/verify", payload);

  if (!res || typeof res.data === "undefined") {
    throw new Error("Invalid API response");
  }

  if (!res.data.token) {
    throw new Error("Missing token");
  }

  setToken(res.data.token);

  return res.data;
}
