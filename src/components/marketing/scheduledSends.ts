// BF_PORTAL_SCHEDULED_SENDS_v23
// The two silos expose different list endpoints and payload shapes, so keep
// those differences out of the composer UI by normalising them here.

export type RawSendJob = Record<string, unknown>;

export type ScheduledSend = {
  id: string;
  name: string;
  total: number;
  sendAt: string | null;
  status: string;
};

/** BI mounts its list under /email; BF does not. */
export function sendJobsPath(apiBase: string): string {
  return apiBase.includes("/bi/") ? `${apiBase}/email/send-jobs` : `${apiBase}/send-jobs`;
}

const str = (value: unknown): string => (typeof value === "string" ? value.trim() : "");
const num = (value: unknown): number => (Number.isFinite(Number(value)) ? Number(value) : 0);

export function normalizeSendJob(raw: RawSendJob): ScheduledSend {
  return {
    id: str(raw.id) || str(raw.job_id),
    // BI carries the subject line; BF carries the audience tag.
    name: str(raw.subject) || str(raw.tag) || "(untitled)",
    total: num(raw.total) || num(raw.recipient_count),
    sendAt: str(raw.scheduled_at) || str(raw.not_before) || null,
    status: str(raw.status) || "queued",
  };
}

const DONE = ["sent", "completed", "complete", "finished", "cancelled", "canceled", "failed"];

/** Only show mail that has not gone yet; send history is a separate feature. */
export function pendingSends(rows: RawSendJob[], now: Date = new Date()): ScheduledSend[] {
  return rows
    .map(normalizeSendJob)
    .filter((job) => job.id && !DONE.includes(job.status.toLowerCase()))
    .filter((job) => !job.sendAt || new Date(job.sendAt).getTime() > now.getTime() - 60 * 60_000)
    .sort((a, b) => {
      if (!a.sendAt) return 1;
      if (!b.sendAt) return -1;
      return new Date(a.sendAt).getTime() - new Date(b.sendAt).getTime();
    });
}

/** Local wall-clock time with the zone named, so an incorrect hour is visible. */
export function formatSendAt(sendAt: string | null): string {
  if (!sendAt) return "As soon as the hold window passes";
  const at = new Date(sendAt);
  if (Number.isNaN(at.getTime())) return "Unknown";
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || "local time";
  return `${at.toLocaleString()} (${zone})`;
}
