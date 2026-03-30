import { startOtp as startOtpFlow, verifyOtp as verifyOtpFlow } from "@/lib/auth";

export async function startOtp(payload: { phone: string }) {
  return startOtpFlow(payload.phone);
}

export async function verifyOtp(payload: { phone: string; code: string }) {
  return verifyOtpFlow(payload.phone, payload.code);
}
