// @ts-nocheck
export async function disabledFeature() {
  return null;
}

export interface CallSession {
  id: string;
  direction: "inbound" | "outbound";
  status: string;
  started_at: string;
  duration_seconds?: number;
  voicemail_url?: string | null;
}

export async function fetchCallHistory(_clientId?: string): Promise<CallSession[]> {
  return [];
}
