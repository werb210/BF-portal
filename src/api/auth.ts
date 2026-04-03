import { baseApi } from "./index";
import { endpoints } from "@/lib/endpoints";

export async function startOtp(phone: string) {
  return baseApi(endpoints.otpStart, {
    method: "POST",
    body: JSON.stringify({ phone }),
  });
}

export async function verifyOtp(phone: string, code: string) {
  const response = await baseApi<{ token?: string; data?: { token?: string } }>(endpoints.otpVerify, {
    method: "POST",
    body: JSON.stringify({ phone, code }),
  });

  const token = response?.data?.token || response?.token;
  if (token) {
    localStorage.setItem("token", token);
  }

  return response;
}

export const sendOtp = startOtp;
