export async function getVoiceToken(identity: string): Promise<string> {
  const base = import.meta.env.VITE_API_BASE_URL;

  let res: Response;
  try {
    res = await fetch(`${base}/api/voice/token?identity=${identity}`);
  } catch {
    throw new Error("Unable to reach voice service. Check your connection and try again.");
  }

  if (!res.ok) {
    throw new Error(`Voice token request failed (${res.status}). Please try again.`);
  }

  const data = await res.json();

  if (!data?.token) {
    throw new Error("Voice token missing from response.");
  }

  return data.token;
}
