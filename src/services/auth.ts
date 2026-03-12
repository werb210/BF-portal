import api from "@/lib/api";

export type OtpStartPayload = { phone: string };
export type OtpVerifyPayload = { phone: string; code: string };

export type AuthenticatedUser = {
  id?: string;
  email?: string;
  role?: string;
  roles?: string[];
  capabilities?: string[];
};

export async function startOtp({ phone }: OtpStartPayload) {
  const res = await api.post("/api/auth/otp/start", { phone }, { skipAuth: true });
  return res.data;
}

export async function verifyOtp({ phone, code }: OtpVerifyPayload) {
  const res = await api.post("/api/auth/otp/verify", { phone, code }, { skipAuth: true });

  const data = res.data;

  const token = data.token || data.accessToken || data.access_token || data.jwt || null;

  if (token) {
    localStorage.setItem("boreal_staff_token", token);
  }

  if (data.user) {
    localStorage.setItem("boreal_staff_user", JSON.stringify(data.user));
  }

  return data;
}

export async function logout() {
  try {
    await api.post("/api/auth/logout");
  } catch {}

  localStorage.removeItem("boreal_staff_token");
  localStorage.removeItem("boreal_staff_user");
}
