import { getVoiceToken } from "@/telephony/getVoiceToken";

export async function fetchVoiceToken(identity: string) {
  void identity;
  return getVoiceToken();
}
