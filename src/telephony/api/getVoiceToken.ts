export async function getVoiceToken(identity: string) {
  const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/voice/token?identity=${identity}`);

  const data = await res.json();

  return data.token;
}
