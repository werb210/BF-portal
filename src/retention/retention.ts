// BF_PORTAL_v855_RETENTION - record retention and legal holds (BF-Server src/retention/, GET/POST /api/retention/...).
// Records are kept 7 years from the later of upload and the file's closing (funded, declined or withdrawn), and an
// admin can place a legal hold on an application, contact or company. Delete buttons show the lock and the date.
// Every silo (BF, BI, SLF, KS): the api client sends X-Silo, so holds and the report are the current silo's.
import { useEffect, useState } from "react";
import { api } from "@/api";

export type HoldSummary = { id: string; target_type: string; target_id: string; target_label: string | null; reason: string; placed_at: string | null };

export type RetentionStatus = {
  locked: boolean;
  reason: "hold" | "retention" | null;
  deletable_on: string | null;
  earliest_deletable_on: string | null;
  file_open: boolean;
  holds: HoldSummary[];
  message: string | null;
};

export type HoldRow = HoldSummary & {
  placed_by_name: string | null;
  released_at: string | null;
  released_by_name: string | null;
  release_reason: string | null;
};

export type RetentionReport = {
  generated_at: string;
  retention_years: number;
  eligible_applications: Array<{ application_id: string; label: string; silo: string | null; closed_at: string | null; eligible_since: string }>;
  eligible_documents: Array<{ document_id: string; application_id: string; label: string | null; application_label: string | null; eligible_since: string }>;
  eligible_audit_events: { count: number; oldest: string | null };
  totals: { records: number; open_files: number; locked_until_date: number; held: number; eligible: number };
};

export type RetentionTarget = "application" | "document" | "contact" | "company";

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});
const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);

/** A server status (or anything) as a RetentionStatus; unknown shapes are "not locked" so nothing is blocked by mistake. */
export function parseStatus(raw: unknown): RetentionStatus {
  const r = obj(raw);
  const reason = r.reason === "hold" || r.reason === "retention" ? r.reason : null;
  return {
    locked: r.locked === true,
    reason,
    deletable_on: str(r.deletable_on),
    earliest_deletable_on: str(r.earliest_deletable_on),
    file_open: r.file_open === true,
    holds: Array.isArray(r.holds) ? (r.holds as HoldSummary[]) : [],
    message: str(r.message),
  };
}

/** "24 Oct 2033" from "2033-10-24" (no time zone shift). */
export function formatDay(iso: string | null): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}

/** The short label beside a locked delete button. */
export function lockLabel(s: RetentionStatus): string {
  if (!s.locked) return "";
  if (s.reason === "hold") return "Legal hold";
  if (s.deletable_on) return `Locked until ${formatDay(s.deletable_on)}`;
  if (s.file_open) return "Locked: file still open";
  return "Locked";
}

/** The full explanation (button tooltip / message). */
export function lockMessage(s: RetentionStatus): string {
  return s.message ?? lockLabel(s);
}

/** The message to show when a delete was refused (423 from the server), else null. */
export function refusedDeleteMessage(e: unknown): string | null {
  const err = e as { status?: number; message?: string; details?: unknown };
  if (err?.status !== 423) return null;
  const d = obj(err.details);
  const msg = str(d.message) ?? str(err.message) ?? "This record is kept on file and cannot be deleted yet.";
  const day = str(d.deletable_on);
  return day && !msg.includes(day) ? `${msg} It can be deleted from ${formatDay(day)}.` : msg;
}

export async function fetchRetention(type: RetentionTarget, id: string): Promise<RetentionStatus | null> {
  try {
    return parseStatus(await api.get<unknown>(`/api/retention/status?type=${type}&id=${encodeURIComponent(id)}`));
  } catch {
    return null;
  }
}

export async function fetchApplicationRetention(applicationId: string): Promise<{ application: RetentionStatus | null; documents: Record<string, RetentionStatus> }> {
  try {
    const r = obj(await api.get<unknown>(`/api/retention/applications/${encodeURIComponent(applicationId)}`));
    const docs: Record<string, RetentionStatus> = {};
    for (const [k, v] of Object.entries(obj(r.documents))) docs[k] = parseStatus(v);
    return { application: r.application ? parseStatus(r.application) : null, documents: docs };
  } catch {
    return { application: null, documents: {} };
  }
}

/** React hook: the retention status of one record (null while loading or when the server has none). */
export function useRetention(type: RetentionTarget, id: string | null | undefined, refreshKey: unknown = 0): RetentionStatus | null {
  const [status, setStatus] = useState<RetentionStatus | null>(null);
  useEffect(() => {
    let alive = true;
    setStatus(null);
    if (!id) return undefined;
    void fetchRetention(type, id).then((s) => { if (alive) setStatus(s); });
    return () => { alive = false; };
  }, [type, id, refreshKey]);
  return status;
}

export async function listHolds(includeReleased: boolean): Promise<HoldRow[]> {
  const r = obj(await api.get<unknown>(`/api/retention/holds${includeReleased ? "?include_released=1" : ""}`));
  return Array.isArray(r.holds) ? (r.holds as HoldRow[]) : [];
}

export async function placeHold(target_type: "application" | "contact" | "company", target_id: string, reason: string): Promise<HoldRow> {
  const r = obj(await api.post<unknown>("/api/retention/holds", { target_type, target_id, reason }));
  return r.hold as HoldRow;
}

export async function releaseHold(id: string, reason: string): Promise<HoldRow> {
  const r = obj(await api.post<unknown>(`/api/retention/holds/${encodeURIComponent(id)}/release`, { reason }));
  return r.hold as HoldRow;
}

export async function fetchReport(): Promise<RetentionReport> {
  return (await api.get<RetentionReport>("/api/retention/report")) as RetentionReport;
}
