import { ENV } from "@/config/env";

export async function fetchVoiceToken(identity: string) {
  const params = new URLSearchParams({ identity });
  const res = await fetch(`${ENV.API_BASE_URL}/voice/token?${params.toString()}`);

  if (!res.ok) {
    throw new Error("Failed to fetch voice token");
  }

  const data = await res.json();

  return data.token;
}
