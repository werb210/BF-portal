import api from "../api/client";

export async function verifyOtp(phone: string, code: string) {
  const res = await api.post(
    "/auth/otp/verify",
    { phone, code },
    { headers: { "Content-Type": "application/json" } }
  );

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
