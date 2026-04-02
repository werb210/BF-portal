import { api } from "@/api";

export interface Voicemail {
  id: string;
  recordingUrl: string;
  createdAt: string;
  clientId: string;
}

export async function fetchVoicemails(clientId: string): Promise<Voicemail[]> {
  const data = await api<Voicemail[]>(`/api/calls?clientId=${encodeURIComponent(clientId)}`);
  return Array.isArray(data) ? data : [];
}
