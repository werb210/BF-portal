export interface Voicemail {
  id: string;
  recordingUrl: string;
  createdAt: string;
  clientId: string;
}

function resolveApiUrl(path: string): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return new URL(path, window.location.origin).toString();
  }

  return path;
}

export async function fetchVoicemails(clientId: string): Promise<Voicemail[]> {
  try {
    const res = await fetch(resolveApiUrl(`/api/voicemails?clientId=${encodeURIComponent(clientId)}`), {
      credentials: "include"
    });

    if (!res.ok) return [];

    return res.json() as Promise<Voicemail[]>;
  } catch {
    return [];
  }
}
