import { apiClient } from "@/lib/apiClient";

export async function getVoiceToken(identity: string): Promise<string> {
  try {
    const data = await apiClient.get<{ token?: string }>(`/api/telephony/token?identity=${encodeURIComponent(identity)}`);
    if (!data?.token) {
      throw new Error("Voice token missing from response.");
    }
    return data.token;
  } catch {
    throw new Error("Unable to reach voice service. Check your connection and try again.");
  }
}
