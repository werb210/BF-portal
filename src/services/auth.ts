import { OtpVerify, Contracts } from "@/lib/contracts";
import { apiRequest } from "@/lib/api";
import { requestWithContract } from "@/lib/contractsApi";

export async function startOtp(phone: string) {
  return requestWithContract(Contracts.authOtpStart, {
    method: "POST",
    body: { phone },
  });
}

export async function verifyOtp(phone: string, otp: string) {
  const res = await apiRequest("/auth/otp/verify", {
    method: "POST",
    body: JSON.stringify({ phone, otp }),
  });

  const parsed = OtpVerify.response.parse(res);

  localStorage.setItem("token", parsed.data.token);

  return parsed.data;
}
