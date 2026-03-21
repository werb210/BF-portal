import { AUTH_CONTRACT } from "@/contracts";
import { apiFetch } from "@/lib/api";

export async function startOtp(payload: any) {
  return apiFetch(AUTH_CONTRACT.OTP_START, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function verifyOtp(payload: any) {
  return apiFetch(AUTH_CONTRACT.OTP_VERIFY, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}
