import api from "@/lib/api";

export async function getTelephonyToken() {
  const res = await api.get<{ data?: { token?: string }; token?: string }>("/api/telephony/token");
  const token = res.data?.data?.token ?? res.data?.token;

  if (!token) {
    throw new Error("Telephony token missing");
  }

  return token;
}

export async function getVoiceToken() {
  return getTelephonyToken();
}
