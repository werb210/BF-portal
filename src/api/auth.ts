import { apiRequest } from "@/lib/api"; // adjust if your path differs

// Twilio Verify ONLY

export async function sendOtp(phone: string) {
  if (!phone) throw new Error("phone required");

  const res = await apiRequest("/auth/send-otp", {
    method: "POST",
    body: { phone },
  });

  return res;
}

export async function verifyOtp(phone: string, code: string) {
  if (!phone || !code) {
    throw new Error("phone + code required");
  }

  const res = await apiRequest("/auth/verify-otp", {
    method: "POST",
    body: { phone, code },
  });

  if (!res.success) {
    throw new Error("OTP rejected");
  }

  return res;
}
