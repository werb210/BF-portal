import api from "../core/apiClient";

export async function verifyOtp(phone: string, code: string) {
  const res = await api.post("/auth/otp/verify", { phone, code });

  const token = res?.data?.token;

  if (token) {
    localStorage.setItem("bf_token", token);
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  }

  return res.data;
}

export function logout() {
  localStorage.removeItem("bf_token");
  delete api.defaults.headers.common["Authorization"];
}
