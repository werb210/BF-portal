import { apiRequest } from "@/lib/api";

export async function getTelephonyToken() {
  const result = await apiRequest<{ token?: string }>("/telephony/token");
  const token = result.token;

  if (!token) {
    throw new Error("Telephony token missing");
  }

  return token;
}

export async function getVoiceToken() {
  return getTelephonyToken();
}
