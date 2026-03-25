import { z } from "zod";

const PhoneSchema = z.string().min(10);
const OtpSchema = z.string().min(4);

const AuthOtpStartRequest = z.object({
  phone: PhoneSchema
});

const AuthOtpStartResponse = z.object({
  success: z.boolean(),
  otpRequestId: z.string().optional(),
  message: z.string().optional()
});

const AuthOtpVerifyRequest = z.object({
  phone: PhoneSchema,
  otp: OtpSchema
});

const AuthOtpVerifyResponse = z.object({
  token: z.string(),
  refreshToken: z.string().optional(),
  user: z.record(z.unknown()).optional()
});

const TelephonyTokenRequest = z.object({}).optional();
const TelephonyTokenResponse = z.object({ token: z.string().min(1) });

export const Contracts = {
  authOtpStart: {
    path: "/auth/otp/start",
    request: AuthOtpStartRequest,
    response: AuthOtpStartResponse
  },
  authOtpVerify: {
    path: "/auth/otp/verify",
    request: AuthOtpVerifyRequest,
    response: AuthOtpVerifyResponse
  },
  telephonyToken: {
    path: "/telephony/token",
    request: TelephonyTokenRequest,
    response: TelephonyTokenResponse
  }
};
