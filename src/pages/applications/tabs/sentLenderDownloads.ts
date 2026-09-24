// BF_PORTAL_BLOCK_v459_PACKAGE_DOWNLOADS
// A package too large to email goes to the lender as a download link. BF-Server
// counts each download; this turns that into one line under the "Sent" marker so
// staff can see whether the lender has actually opened the file.
export type SentLenderEntry = {
  lenderId?: string;
  sentAt?: string | null;
  viaLink?: boolean;
  downloadCount?: number;
  lastDownloadedAt?: string | null;
  manual?: boolean; // BF_PORTAL_BLOCK_v483 - recorded by staff, sent outside the portal
};

export function describeDownloads(entry: SentLenderEntry | null | undefined): string | null {
  if (!entry?.viaLink) return null;
  const count = Number(entry.downloadCount ?? 0);
  if (!Number.isFinite(count) || count <= 0) return "Download link sent \u00b7 not downloaded yet";
  const last = entry.lastDownloadedAt ? new Date(entry.lastDownloadedAt) : null;
  const when = last && !Number.isNaN(last.getTime()) ? ` \u00b7 last ${last.toLocaleDateString()}` : "";
  return `Downloaded ${count}\u00d7${when}`;
}
