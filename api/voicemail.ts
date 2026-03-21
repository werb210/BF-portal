import { apiFetch } from "@/lib/api";

export interface Voicemail {
  id: string;
  recordingUrl: string;
  createdAt: string;
  clientId: string;
}

export async function fetchVoicemails(clientId: string): Promise<Voicemail[]> {
  try {
    const res = await apiFetch(`/api/calls?clientId=${encodeURIComponent(clientId)}`);

    if (!res.ok) return [];

    return res.json() as Promise<Voicemail[]>;
  } catch {
    return [];
  }
}
