// BF_PORTAL_v853_KS_PHONE_SUPPORT - the Keystone support queue and phone line settings on BF-Server (/api/ks/support).
// Calls go through the portal's usual BF-Server client; on /silo/ks/crm pages they carry X-Silo: KS, and every ticket
// row says silo "KS", so the silo guard lets them through and would stop anything else.
import { api } from "@/api";

export type KsTicketStatus = "new" | "open" | "waiting" | "resolved" | "closed";
export type KsTicketPriority = "low" | "normal" | "high" | "urgent";
export type KsTicketChannel = "phone" | "email" | "in_app" | "manual";
export type KsSlaState = "met" | "missed" | "overdue" | "due_soon" | "on_track" | "none";

export const KS_TICKET_STATUSES: Array<{ key: KsTicketStatus; label: string }> = [
  { key: "new", label: "New" },
  { key: "open", label: "Open" },
  { key: "waiting", label: "Waiting on customer" },
  { key: "resolved", label: "Resolved" },
  { key: "closed", label: "Closed" },
];
export const KS_TICKET_PRIORITIES: KsTicketPriority[] = ["low", "normal", "high", "urgent"];
export const KS_TICKET_CHANNELS: Array<{ key: KsTicketChannel; label: string }> = [
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "in_app", label: "In-app" },
  { key: "manual", label: "Manual" },
];

export type KsSupportTicket = {
  id: string;
  number: number;
  subject: string;
  channel: KsTicketChannel | string;
  priority: KsTicketPriority | string;
  status: KsTicketStatus | string;
  status_label: string;
  company_id: string | null;
  company_name: string | null;
  company_plan: string | null;
  contact_id: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  from_phone: string | null;
  from_email: string | null;
  from_name: string | null;
  assignee_user_id: string | null;
  assignee_name: string | null;
  support_level: string | null;
  support_level_label: string | null;
  sla_target: string;
  sla_due_at: string | null;
  responded_at: string | null;
  sla_state: KsSlaState;
  message_count: number;
  last_message_at: string | null;
  created_at: string | null;
  silo: "KS";
};

export type KsSupportMessage = {
  id: string;
  kind: "customer" | "reply" | "note" | "call" | "voicemail" | "system" | string;
  channel: string | null;
  body: string;
  author_name: string | null;
  call_sid: string | null;
  recording_url: string | null;
  created_at: string | null;
  call?: { status: string | null; duration_seconds: number | null; answered: boolean; answered_by: string | null; summary: string | null; transcript: string | null };
};

export type KsStaffMember = { id: string; name: string; email: string | null; role: string | null };

export type KsWeekly = Record<"sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat", Array<[string, string]>>;
export type KsQueueSettings = {
  queue: "sales" | "support";
  label: string;
  ringUserIds: string[];
  ringTimeoutSeconds: number;
  hoursEnabled: boolean;
  timezone: string;
  weekly: KsWeekly;
  updatedAt: string | null;
};
export type KsPhoneInfo = {
  configured: boolean;
  number: string | null;
  voice_url: string;
  status_callback_url: string;
  support_email: string | null;
  queues: KsQueueSettings[];
};

export type TicketFilters = { status?: string; assignee?: string; priority?: string; channel?: string; q?: string; company_id?: string; contact_id?: string };

const BASE = "/api/ks/support";

function query(f: TicketFilters): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `?${s}` : "";
}

export const ksSupportApi = {
  tickets: async (f: TicketFilters = {}) => (await api.get<{ tickets?: KsSupportTicket[] }>(`${BASE}/tickets${query(f)}`))?.tickets ?? [],
  ticket: (id: string) => api.get<{ ticket: KsSupportTicket; messages: KsSupportMessage[] }>(`${BASE}/tickets/${encodeURIComponent(id)}`),
  create: (body: { subject: string; body?: string; channel?: KsTicketChannel; priority?: KsTicketPriority; contact_id?: string | null; company_id?: string | null; assignee_user_id?: string | null }) =>
    api.post<{ id: string; number: number }>(`${BASE}/tickets`, body),
  update: (id: string, body: Partial<{ status: KsTicketStatus; priority: KsTicketPriority; assignee_user_id: string | null; subject: string; contact_id: string | null; company_id: string | null }>) =>
    api.patch<{ ticket: KsSupportTicket; messages: KsSupportMessage[] }>(`${BASE}/tickets/${encodeURIComponent(id)}`, body),
  note: (id: string, body: string) => api.post(`${BASE}/tickets/${encodeURIComponent(id)}/notes`, { body }),
  reply: (id: string, body: { channel: "email" | "sms"; body: string; status: KsTicketStatus }) =>
    api.post<{ to: string }>(`${BASE}/tickets/${encodeURIComponent(id)}/reply`, body),
  staff: async () => (await api.get<{ staff?: KsStaffMember[] }>(`${BASE}/staff`))?.staff ?? [],
  phone: () => api.get<KsPhoneInfo>(`${BASE}/phone`),
  saveQueue: (queue: "sales" | "support", body: Omit<KsQueueSettings, "queue" | "updatedAt">) =>
    api.put<{ queue: KsQueueSettings }>(`${BASE}/phone/queues/${queue}`, body),
};

export const SLA_LABELS: Record<KsSlaState, string> = {
  met: "SLA met",
  missed: "SLA missed",
  overdue: "Overdue",
  due_soon: "Due soon",
  on_track: "On track",
  none: "No SLA",
};

/** White text on each: green 5.0:1, red 6.5:1, amber 5.0:1, blue 6.7:1, slate 7.6:1. */
export const SLA_COLOURS: Record<KsSlaState, string> = {
  met: "#15803d",
  missed: "#b91c1c",
  overdue: "#b91c1c",
  due_soon: "#b45309",
  on_track: "#1d4ed8",
  none: "#475569",
};

/** The server's message for a failed call, including field errors when there are any. */
export function apiErrorText(err: unknown, fallback = "Something went wrong."): string {
  const e = err as { message?: unknown; details?: { errors?: Record<string, string>; message?: string } } | null;
  const fields = e?.details?.errors ? Object.entries(e.details.errors).map(([k, v]) => `${k.replace(/_/g, " ")} ${v}`) : [];
  const detail = typeof e?.details?.message === "string" && e.details.message.trim() ? e.details.message : null;
  const base = detail ?? (typeof e?.message === "string" && e.message.trim() ? e.message : fallback);
  return fields.length ? `${base}: ${fields.join("; ")}` : base;
}
