import { apiRequest } from "@/lib/api";

export async function startOtp(phone: string) {
  return apiRequest("/auth/otp/start", {
    method: "POST",
    body: JSON.stringify({ phone }),
  });
}

export async function verifyOtp(phone: string, otp: string) {
  const res = await apiRequest("/auth/otp/verify", {
    method: "POST",
    body: JSON.stringify({ phone, otp }),
  });

  if (res && typeof res === "object" && "token" in res) {
    const token = (res as { token?: string }).token;
    if (token) {
      localStorage.setItem("token", token);
    }
  }

  return res;
}
