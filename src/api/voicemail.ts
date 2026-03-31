import { apiFetch } from "@/api/client";

export interface Voicemail {
  id: string;
  recordingUrl: string;
  createdAt: string;
  clientId: string;
}

export async function fetchVoicemails(clientId: string): Promise<Voicemail[]> {
  const res = (await apiFetch(`/api/calls?clientId=${encodeURIComponent(clientId)}`)) as Voicemail[];
  return Array.isArray(res) ? res : [];
}
