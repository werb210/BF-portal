import { apiFetch } from "@/api/client";

export interface Voicemail {
  id: string;
  recordingUrl: string;
  createdAt: string;
  clientId: string;
}

export async function fetchVoicemails(clientId: string): Promise<Voicemail[]> {
  const res = await apiFetch<Voicemail[]>(`/api/calls?clientId=${encodeURIComponent(clientId)}`);
  if (!res.success) {
    throw new Error(res.error);
  }
  if (!Array.isArray(res.data)) {
    return [];
  }
  return res.data;
}
