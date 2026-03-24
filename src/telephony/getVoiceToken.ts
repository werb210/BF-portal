import { safeApiFetch } from "@api/client";

export async function getVoiceToken() {
  const payload = await safeApiFetch<{ token?: string }>("/api/telephony/token");
  if (!payload) {
    return "";
  }
  return payload?.token ?? "";
}
