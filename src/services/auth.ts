import { API_BASE } from "@/lib/api";

export async function startOtp(phone: string) {
  const res = await fetch(`${API_BASE}/auth/otp/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ phone }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("OTP START FAILED:", res.status, text);
    throw new Error("OTP start failed");
  }

  return res.json();
}

export async function verifyOtp(phone: string, code: string) {
  const res = await fetch(`${API_BASE}/auth/otp/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ phone, code }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("OTP VERIFY FAILED:", res.status, text);
    throw new Error("OTP verify failed");
  }

  const result = await res.json();
  localStorage.setItem("token", result.token);
  return result;
}
