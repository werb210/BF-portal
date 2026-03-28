import { apiRequest } from "@/lib/api";
import { setToken } from "@/lib/auth";

export async function startOtp(payload: { phone: string }) {
  return apiRequest<{ sessionId: string }>("/auth/otp/start", {
    method: "POST",
    body: payload,
  });
}

export async function verifyOtp(payload: { phone: string; code: string }) {
  const result = await apiRequest<{ token?: string }>("/auth/otp/verify", {
    method: "POST",
    body: payload,
  });

  if (!result.token) {
    throw new Error("Missing token");
  }

  setToken(result.token);

  return result;
}
