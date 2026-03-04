export async function fetchVoiceToken(identity: string) {
  const res = await fetch(`/api/voice/token?identity=${identity}`);

  if (!res.ok) {
    throw new Error("Failed to fetch voice token");
  }

  const data = await res.json();

  return data.token;
}
