import { api } from "@/api";
export async function disabledFeature() {
  return null;
}

export interface CallSession {
  id: string;
  direction: "inbound" | "outbound";
  status: string;
  started_at: string;
  duration_seconds?: number | null;
  voicemail_url?: string | null;
  phone?: string | null;
  contact_id?: string | null;
  contact_name?: string | null;
}

// BF_PORTAL_RECENT_CALLS_v1 - was a stub returning []. Now reads the real
// per-staff recent-calls endpoint (call_logs joined to contacts for a name).
export async function fetchCallHistory(_clientId?: string): Promise<CallSession[]> {
  try {
    const r = await api<{ ok?: boolean; items?: any[] } | any[]>("/api/voice/recent-calls");
    const items = Array.isArray(r) ? r : (r?.items ?? []);
    return items.map((c: any) => ({
      id: String(c.id),
      direction: c.direction === "inbound" ? "inbound" : "outbound",
      status: String(c.status ?? ""),
      started_at: c.created_at ?? c.started_at ?? "",
      duration_seconds: c.duration_seconds ?? null,
      phone: c.phone_number ?? c.phone ?? null,
      contact_id: c.contact_id ?? null,
      contact_name: c.contact_name ?? null,
    }));
  } catch {
    return [];
  }
}
