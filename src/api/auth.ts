import { apiRequest } from "@/lib/api";
import { setToken } from "@/lib/auth";

export async function startOtp(payload: { phone: string }) {
  return apiRequest<{ sessionId: string }>("post", "/auth/otp/start", payload);
}

export async function verifyOtp(payload: { phone: string; code: string }) {
  const result = await apiRequest<{ token?: string }>("post", "/auth/otp/verify", payload);

  if (!result.token) {
    throw new Error("Missing token");
  }

  setToken(result.token);

  return result;
}
