import { baseApi } from "./index";
import { endpoints } from "@/lib/endpoints";

export async function startOtp(phone: string) {
  return baseApi(endpoints.otpStart, {
    method: "POST",
    body: JSON.stringify({ phone }),
  });
}

export async function verifyOtp(phone: string, code: string) {
  return baseApi(endpoints.otpVerify, {
    method: "POST",
    body: JSON.stringify({ phone, code }),
  });
}

export const sendOtp = startOtp;
