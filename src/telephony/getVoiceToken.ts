import { apiFetch } from "@api/client";

export async function getVoiceToken() {
  const payload = await apiFetch<{ token?: string }>("/api/telephony/token");
  return payload?.token ?? "";
}
