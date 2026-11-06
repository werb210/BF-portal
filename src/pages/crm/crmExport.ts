// BF_PORTAL_v907_CRM_EXPORT - Export on Contacts and Companies. It did not work: it wrote only the 200 rows on screen,
// every raw field (ids, JSON) instead of the columns shown, wrote nothing at all when the page was empty, and released
// the file's link in the same tick it clicked it, which cancels the download in Safari and the iPad app. Now it fetches
// every row that matches the current filters (search, owner, tags, segment, custom field filters), writes the columns
// chosen in Columns, and saves the file (sharing it on the iPad app).
import { saveBlob } from "@/lib/downloadName";

export type ExportColumn<R> = { label: string; value: (row: R) => unknown };
export type PagedFetch<R> = (page: number, pageSize: number) => Promise<{ rows: R[]; total: number }>;

export const EXPORT_PAGE_SIZE = 500; // the server's maximum page size
export const EXPORT_MAX_ROWS = 50_000;

/** Every row matching the filters, page by page. */
export async function fetchAllRows<R>(fetchPage: PagedFetch<R>, onProgress?: (n: number, total: number) => void): Promise<R[]> {
  const out: R[] = [];
  for (let page = 1; page <= Math.ceil(EXPORT_MAX_ROWS / EXPORT_PAGE_SIZE); page += 1) {
    const r = await fetchPage(page, EXPORT_PAGE_SIZE);
    const rows = Array.isArray(r?.rows) ? r.rows : [];
    out.push(...rows);
    onProgress?.(out.length, Number(r?.total ?? out.length));
    if (rows.length < EXPORT_PAGE_SIZE || (Number.isFinite(r?.total) && out.length >= Number(r.total))) break;
  }
  return out;
}

const cellText = (v: unknown): string => {
  if (v === null || v === undefined) return "";
  if (Array.isArray(v)) return v.map(cellText).filter(Boolean).join("; ");
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
};
const esc = (s: string) => (/[",\n\r]/.test(s) || /^[=+\-@]/.test(s) ? `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"` : s);

/** CSV of the given columns (header row first). Cells that start with = + - @ are quoted so spreadsheets do not run them. */
export function rowsToCsv<R>(rows: R[], columns: ExportColumn<R>[]): string {
  const lines = [columns.map((c) => esc(c.label)).join(",")];
  for (const r of rows) lines.push(columns.map((c) => esc(cellText(c.value(r)))).join(","));
  return "﻿" + lines.join("\r\n"); // BOM so Excel opens accents correctly
}

/** Saves the CSV; on the iPad app (no downloads in the web view) it opens the share sheet instead. */
export async function saveCsv(filename: string, csv: string): Promise<"saved" | "shared"> {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const nav = (typeof navigator !== "undefined" ? navigator : null) as (Navigator & { canShare?: (d: unknown) => boolean }) | null;
  const native = typeof window !== "undefined" && Boolean((window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.());
  if (native && nav?.share && typeof File !== "undefined") {
    const file = new File([blob], filename, { type: "text/csv" });
    if (!nav.canShare || nav.canShare({ files: [file] })) {
      await nav.share({ files: [file], title: filename });
      return "shared";
    }
  }
  saveBlob(blob, filename); // releases the link a second later, after the download has started
  return "saved";
}

export const exportFileName = (what: string, now = new Date()) => `${what}-${now.toISOString().slice(0, 10)}.csv`;
