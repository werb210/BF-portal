import { getVoiceToken } from "@/telephony/getVoiceToken";
export async function fetchVoiceToken(identity) {
    void identity;
    return getVoiceToken();
}
