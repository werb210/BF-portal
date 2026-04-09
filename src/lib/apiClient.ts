import { api } from "@/api";
import { OtpStartSchema, OtpVerifySchema } from "../contracts/api";

export async function otpStart(payload: unknown) {
  const parsed = OtpStartSchema.parse(payload);
  return api.post("/api/auth/otp/start", parsed);
}

export async function otpVerify(payload: unknown) {
  const parsed = OtpVerifySchema.parse(payload);
  return api.post("/api/auth/otp/verify", parsed);
}
