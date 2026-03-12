import api from "@/lib/api";

export async function startOtp(phone: string) {
  const res = await api.post("/auth/otp/start", { phone });
  return res.data;
}

export async function verifyOtp(phone: string, code: string) {
  const res = await api.post("/auth/otp/verify", { phone, code });

  const data = res.data;

  const token =
    data.token ||
    data.accessToken ||
    data.access_token ||
    data.jwt ||
    null;

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
    await api.post("/auth/logout");
  } catch {}

  localStorage.removeItem("boreal_staff_token");
  localStorage.removeItem("boreal_staff_user");
}
