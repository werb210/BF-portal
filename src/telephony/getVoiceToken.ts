import { apiClient } from "@/api/client";

export async function getVoiceToken() {
  const res = await apiClient.get("/telephony/token");
  return res.data.token;
}
