import { apiClient } from "@/api/apiClient";

export async function getVoiceToken() {
  const res = await apiClient.get("/telephony/token");
  return res.data.token;
}
