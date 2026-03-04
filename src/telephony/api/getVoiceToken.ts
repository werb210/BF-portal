export async function getVoiceToken(identity: string): Promise<string> {
  const base = import.meta.env.VITE_API_BASE_URL;

  const res = await fetch(`${base}/api/voice/token?identity=${identity}`);

  if (!res.ok) {
    throw new Error("Failed to fetch Twilio voice token");
  }

  const data = await res.json();
  return data.token;
}
