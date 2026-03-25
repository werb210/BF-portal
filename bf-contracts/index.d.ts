import { z } from "zod";

export declare const Contracts: {
  authOtpStart: {
    path: "/auth/otp/start";
    request: z.ZodObject<{ phone: z.ZodString }, "strip", z.ZodTypeAny, { phone?: string }, { phone?: string }>;
    response: z.ZodObject<{
      success: z.ZodBoolean;
      otpRequestId: z.ZodOptional<z.ZodString>;
      message: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, { success?: boolean; otpRequestId?: string; message?: string }, { success?: boolean; otpRequestId?: string; message?: string }>;
  };
  authOtpVerify: {
    path: "/auth/otp/verify";
    request: z.ZodObject<{ phone: z.ZodString; otp: z.ZodString }, "strip", z.ZodTypeAny, { phone?: string; otp?: string }, { phone?: string; otp?: string }>;
    response: z.ZodObject<{
      token: z.ZodString;
      refreshToken: z.ZodOptional<z.ZodString>;
      user: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, { token?: string; refreshToken?: string; user?: Record<string, unknown> }, { token?: string; refreshToken?: string; user?: Record<string, unknown> }>;
  };
  telephonyToken: {
    path: "/telephony/token";
    request: z.ZodOptional<z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>>;
    response: z.ZodObject<{ token: z.ZodString }, "strip", z.ZodTypeAny, { token?: string }, { token?: string }>;
  };
};
