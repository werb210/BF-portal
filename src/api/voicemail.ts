import { apiFetch } from "@/api/client";

export interface Voicemail {
  id: string;
  recordingUrl: string;
  createdAt: string;
  clientId: string;
}

export async function fetchVoicemails(clientId: string): Promise<Voicemail[]> {
  const res = await apiFetch<Voicemail[]>(`/api/calls?clientId=${encodeURIComponent(clientId)}`);
  return res.success && Array.isArray(res.data) ? res.data : [];
}
