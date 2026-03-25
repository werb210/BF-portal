import { Contracts } from "bf-contracts";
import { requestWithContract } from "@/lib/contractsApi";

export async function sendOtp(data: { phone: string }) {
  return requestWithContract(Contracts.authOtpStart, {
    method: "POST",
    body: data
  });
}

export async function verifyOtp(data: { phone: string; otp: string }) {
  return requestWithContract(Contracts.authOtpVerify, {
    method: "POST",
    body: data
  });
}
