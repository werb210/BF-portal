import { apiFetch } from "@/lib/apiFetch";

export async function getTelephonyToken() {
  const res = await apiFetch<{ token?: string }>("/telephony/token");

  if (!res?.token) {
    throw new Error("Telephony token missing");
  }

  return res.token;
}

export async function getVoiceToken() {
  return getTelephonyToken();
}
