import { Contracts } from "@/lib/contracts";
import { apiRequest } from "@/lib/api";
import { requestWithContract } from "@/lib/contractsApi";

export async function startOtp(phone: string) {
  return requestWithContract(Contracts.authOtpStart, {
    method: "POST",
    body: { phone },
  });
}

export async function verifyOtp(phone: string, otp: string) {
  const res = await apiRequest(Contracts.authOtpVerify.path, {
    method: "POST",
    body: JSON.stringify({ phone, otp }),
  });

  const parsed = Contracts.authOtpVerify.response.parse(res);

  localStorage.setItem("token", parsed.token);

  return parsed;
}
