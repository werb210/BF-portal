import { apiRequest } from "@/lib/api"
import { setToken } from "@/auth/token"

export async function startOtp(phone: string) {
  return apiRequest("/api/auth/start-otp", {
    method: "POST",
    body: JSON.stringify({ phone }),
  })
}

export async function verifyOtp(phone: string, code: string) {
  const res = await apiRequest("/api/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({ phone, code }),
  })

  if (!res || !res.token) {
    throw new Error("INVALID_LOGIN")
  }

  setToken(res.token)
  return res
}
