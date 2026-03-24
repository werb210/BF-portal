import { AUTH_CONTRACT } from "@/contracts";
import { apiRequest } from "@/lib/api";

export async function startOtp(payload: { phone: string }) {
  return apiRequest(AUTH_CONTRACT.OTP_START, {
    method: "POST",
    body: JSON.stringify({ phone: payload.phone })
  });
}

export async function verifyOtp(payload: { phone: string; code?: string; otp?: string }) {
  const otp = payload.otp ?? payload.code ?? "";
  const result = await apiRequest(AUTH_CONTRACT.OTP_VERIFY, {
    method: "POST",
    body: JSON.stringify({ phone: payload.phone, otp })
  });

  if (result && typeof result === "object" && "token" in result) {
    const token = (result as { token?: string }).token;
    if (typeof token === "string" && token.length > 0) {
      localStorage.setItem("token", token);
    }
  }

  return result;
}
