import { Contracts } from "bf-contracts";
import { requestWithContract } from "@/lib/contractsApi";

export async function startOtp(phone: string) {
  return requestWithContract(Contracts.authOtpStart, {
    method: "POST",
    body: { phone }
  });
}

export async function verifyOtp(phone: string, otp: string) {
  const res = await requestWithContract(Contracts.authOtpVerify, {
    method: "POST",
    body: { phone, otp }
  });

  localStorage.setItem("token", res.token);

  return res;
}
