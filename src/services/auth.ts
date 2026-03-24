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

  if (!res?.token) {
    throw new Error("Missing token");
  }

  localStorage.setItem("token", res.token);

  return res;
}
