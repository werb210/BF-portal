import { OtpStartSchema, OtpVerifySchema } from "../contracts/api"

export async function otpStart(payload: unknown) {
  const parsed = OtpStartSchema.parse(payload)

  return fetch("/api/auth/otp/start", {
    method: "POST",
    body: JSON.stringify(parsed),
    headers: { "Content-Type": "application/json" }
  })
}

export async function otpVerify(payload: unknown) {
  const parsed = OtpVerifySchema.parse(payload)

  return fetch("/api/auth/otp/verify", {
    method: "POST",
    body: JSON.stringify(parsed),
    headers: { "Content-Type": "application/json" }
  })
}
