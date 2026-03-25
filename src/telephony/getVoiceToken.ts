import { apiFetch } from "@/lib/api";

export async function getTelephonyToken() {
  const res = await apiFetch("/telephony/token", {
    method: "GET"
  });

  if (!res?.token) {
    throw new Error("Telephony token missing");
  }

  return res.token;
}

export async function getVoiceToken() {
  return getTelephonyToken();
}
