import { safeApiFetch } from "@/lib/api";

export interface Voicemail {
  id: string;
  recordingUrl: string;
  createdAt: string;
  clientId: string;
}

export async function fetchVoicemails(clientId: string): Promise<Voicemail[]> {
  try {
    const res = await safeApiFetch<Voicemail[]>(`/calls?clientId=${encodeURIComponent(clientId)}`);
    return Array.isArray(res) ? res : [];
  } catch {
    return [];
  }
}
