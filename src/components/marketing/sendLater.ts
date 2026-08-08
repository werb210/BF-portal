// BF_PORTAL_SEND_LATER_v21
// The composer only ever sent immediately, even though both silos' queues have
// always carried a scheduled timestamp and a worker that respects it.
//
// The picker is a datetime-local input, which yields a wall-clock string with
// no zone ("2026-08-12T09:30"). The browser interprets that in the viewer's
// local zone, which is what a person means by "9:30am". It must be converted
// to an absolute instant before it goes to the server, or a send scheduled in
// Alberta fires at the wrong hour for a server running UTC.

export const MAX_LEAD_DAYS = 90;
export const MIN_LEAD_MINUTES = 2;

/** Value for a datetime-local input's `min` attribute, in local wall-clock. */
export function localInputMin(now: Date = new Date()): string {
  return toLocalInputValue(new Date(now.getTime() + MIN_LEAD_MINUTES * 60_000));
}

/** Value for a datetime-local input's `max` attribute, in local wall-clock. */
export function localInputMax(now: Date = new Date()): string {
  return toLocalInputValue(new Date(now.getTime() + MAX_LEAD_DAYS * 86_400_000));
}

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Converts the input's local wall-clock string to an absolute ISO instant. */
export function toIsoInstant(localValue: string): string | null {
  const raw = (localValue || "").trim();
  if (!raw) return null;
  const at = new Date(raw);
  return Number.isNaN(at.getTime()) ? null : at.toISOString();
}

/** Human confirmation of what was chosen, including the zone, so it is checkable. */
export function describeSchedule(localValue: string, now: Date = new Date()): string {
  const iso = toIsoInstant(localValue);
  if (!iso) return "";
  const at = new Date(iso);
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || "local time";
  if (at.getTime() <= now.getTime()) return `Sends as soon as the hold window passes (${zone}).`;
  return `Sends ${at.toLocaleString()} (${zone}).`;
}
