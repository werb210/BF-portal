// BF_PORTAL_TREND_MONTH_v32
// new Date("2026-03-01") parses as UTC midnight, so west of Greenwich
// toLocaleDateString renders it as Feb 28 and every month label reads one month
// early. Build the date in local time. This lived in two places - the tab and
// the trend chart - and only the tab was fixed in v31, so the chart x-axis
// disagreed with the table beside it.
export function fmtMonth(m: string): string {
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(m);
  const d = iso
    ? new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))
    : new Date(m);
  if (Number.isNaN(d.getTime())) return m;
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}
