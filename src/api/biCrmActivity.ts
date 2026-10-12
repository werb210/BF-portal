// BF_PORTAL_v789_BI_ACTIVITY - activity logged from the shared CRM ActionBar when it runs on a BI
// record. BI contacts and companies live on BI-Server, so their notes, calls, meetings and email logs
// are written there; BF-Server never sees them (it has no BI ids and the BI timeline cannot read it).
import { api } from "@/api";
import type { Scope } from "@/api/crm";

export type CrmTarget = "bf" | "bi";
export type BiActivityEventType = "note" | "call" | "meeting" | "email";

export type BiActivityInput = {
  event_type: BiActivityEventType;
  /** The text the user typed. */
  body: string;
  /** Call outcome, when there is one. */
  outcome?: string | null;
  /** The other form fields. */
  meta?: Record<string, unknown>;
};

export type BiActivityRow = {
  id: string;
  event_type: string;
  body: string | null;
  outcome: string | null;
  meta: Record<string, unknown> | null;
  actor_name: string | null;
  created_at: string;
};

/** BI-Server path for a contact's or a company's activity. */
export function biActivityPath(scope: Scope): string {
  const id = encodeURIComponent(scope.id);
  return scope.kind === "company"
    ? `/api/v1/bi/crm/companies/${id}/activity`
    : `/api/v1/bi/crm/outreach/contacts/${id}/activity`;
}

export async function logBiActivity(scope: Scope, input: BiActivityInput): Promise<unknown> {
  return api(biActivityPath(scope), {
    method: "POST",
    body: {
      event_type: input.event_type,
      body: input.body,
      outcome: input.outcome ?? null,
      meta: input.meta ?? {},
    },
  });
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v : null;
}

/** Accepts { events }, { items }, { data } or a bare array and returns tidy rows. */
export function normalizeBiActivity(raw: unknown): BiActivityRow[] {
  const r = raw as { events?: unknown; items?: unknown; data?: unknown } | unknown[] | null;
  const list: unknown[] = Array.isArray(r)
    ? r
    : Array.isArray(r?.events) ? r.events
    : Array.isArray(r?.items) ? r.items
    : Array.isArray(r?.data) ? r.data
    : [];
  return list
    .filter((row): row is Record<string, unknown> => !!row && typeof row === "object")
    .map((row, i) => ({
      id: String(row.id ?? `row-${i}`),
      event_type: String(row.event_type ?? row.type ?? row.kind ?? "note").toLowerCase(),
      body: str(row.body),
      outcome: str(row.outcome),
      meta: row.meta && typeof row.meta === "object" ? (row.meta as Record<string, unknown>) : null,
      actor_name: str(row.actor_name),
      created_at: String(row.created_at ?? row.occurred_at ?? ""),
    }));
}

export async function listBiActivity(path: string): Promise<BiActivityRow[]> {
  return normalizeBiActivity(await api(path));
}
