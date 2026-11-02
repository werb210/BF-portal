// BF_PORTAL_v864_OOO_UNTIL - the viewer's time zone, with the provinces that stopped changing their clocks in 2026
// computed as fixed offsets: Alberta UTC-6, Manitoba UTC-5 and B.C. UTC-7 all year. Browsers with older time-zone
// data still move America/Edmonton, America/Winnipeg and America/Vancouver back an hour on 2026-11-01.
// Same mapping as BF-Server src/lib/permanentTime.ts. Etc/GMT+N is UTC-N.
export const PERMANENT_ZONES: Readonly<Record<string, string>> = {
  "America/Edmonton": "America/Regina",
  "America/Winnipeg": "Etc/GMT+5",
  "America/Vancouver": "Etc/GMT+7",
};

/** The viewer's IANA zone name as the browser reports it (what the server is told). */
export function viewerZoneName(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Edmonton";
  } catch {
    return "America/Edmonton";
  }
}

/** The zone to compute with for a zone name. */
export function computeZone(name: string = viewerZoneName()): string {
  return PERMANENT_ZONES[name] ?? name;
}

/** YYYY-MM-DD of a moment in a zone. */
export function localDateIn(at: Date, name: string = viewerZoneName()): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: computeZone(name), year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
  } catch {
    return at.toISOString().slice(0, 10);
  }
}
