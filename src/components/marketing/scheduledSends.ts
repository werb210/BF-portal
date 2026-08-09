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

// BF_PORTAL_SCHEDULED_SENDS_DONE_v24 - cancel was hand-built as
// `${apiBase}/send-jobs/${id}/cancel`, which is the BF path. On BI that 404s,
// so the same /email mount has to be honoured here too.
export function sendJobCancelPath(apiBase: string, id: string): string {
  return `${sendJobsPath(apiBase)}/${encodeURIComponent(id)}/cancel`;
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

// BF_PORTAL_SCHEDULED_SENDS_DONE_v24 - BF's send worker writes the terminal
// status as 'done' (BI writes 'sent'). 'done' was missing here, so every blast
// BF had already finished stayed in the list forever with a live Cancel link
// that the server correctly refused. BI looked right only because its
// vocabulary happened to be covered.
const DONE = ["sent", "done", "completed", "complete", "finished", "cancelled", "canceled", "failed", "error"];

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
