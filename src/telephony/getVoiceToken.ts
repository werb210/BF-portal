import { apiRequest } from "@/lib/api";

export async function getTelephonyToken() {
  const res = await apiRequest("/telephony/token");
  if (!res) return "";
  return (res as { token?: string }).token ?? String(res);
}

export async function getVoiceToken() {
  return getTelephonyToken();
}
