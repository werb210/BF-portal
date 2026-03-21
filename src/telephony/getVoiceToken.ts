import { apiFetch } from "@/api/client";

export async function getVoiceToken() {
  const res = await apiFetch("/telephony/token");
  const payload = await res.json();
  return payload.token;
}
