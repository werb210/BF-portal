// BF_PORTAL_v819_MOBILE_REPORT - report-library entries the portal draws itself, plus the clean-up every library list
// gets before it is shown. The catalog comes from BF-Server (/api/reports/catalog), which filters by role; it listed
// "Ads: the story" and "Where applications stop" twice, so the list is de-duplicated by key here.
export type ReportGroup = "money" | "marketing" | "operations";
export type LibraryEntry = { key: string; title: string; silo: string; group: ReportGroup; size: "half" | "full"; description: string };

// BF_PORTAL_v819_MOBILE_REPORT - Marketing > Mobile apps as a Dashboard / Reports card. Marketing-type report:
// Admin and Marketing see it (same rule as "Website visitors" and "Ads: the story"). BF client app data, BF silo only.
export const MOBILE_APPS_KEY = "mobile_apps";
export const MOBILE_APPS_REPORT: LibraryEntry = {
  key: MOBILE_APPS_KEY,
  title: "Mobile apps",
  silo: "BF",
  group: "marketing",
  size: "full",
  description: "Client app use: active users, app vs web, devices, notifications and quick sign-in.",
};
const PORTAL_REPORTS: LibraryEntry[] = [MOBILE_APPS_REPORT];

// BF_PORTAL_v819_MOBILE_REPORT - mirrors BF-Server canSee(): Admin sees all, Marketing all but money, others operations.
export function canSeeReportGroup(role: unknown, group: ReportGroup): boolean {
  const r = String(role ?? "").toLowerCase();
  if (r === "admin") return true;
  if (r === "marketing") return group !== "money";
  return group === "operations";
}

// BF_PORTAL_v819_MOBILE_REPORT - first entry per key wins.
export function dedupeReports<T extends { key: string }>(list: readonly T[]): T[] {
  const seen = new Set<string>();
  return list.filter((item) => (seen.has(item.key) ? false : (seen.add(item.key), true)));
}

// BF_PORTAL_v819_MOBILE_REPORT - the server catalog, de-duplicated, plus portal-drawn reports the person's role allows
// and the server does not list yet.
export function withPortalReports<T extends { key: string }>(catalog: readonly T[] | null | undefined, role: unknown): Array<T | LibraryEntry> {
  const base = dedupeReports(Array.isArray(catalog) ? catalog : []);
  const have = new Set(base.map((r) => r.key));
  return [...base, ...PORTAL_REPORTS.filter((r) => !have.has(r.key) && canSeeReportGroup(role, r.group))];
}
