import { apiClient } from "@/lib/apiClient";

export async function getTelephonyToken() {
  const result = await apiClient<{ token?: string }>("/api/telephony/token", { method: "GET" });
  const token = result.token;

  if (!token) {
    throw new Error("Telephony token missing");
  }

  return token;
}

export async function getVoiceToken() {
  return getTelephonyToken();
}
