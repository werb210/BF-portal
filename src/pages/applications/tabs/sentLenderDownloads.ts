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
  bounce?: { reason: string; recipient?: string | null; at?: string | null } | null; // BF_PORTAL_BLOCK_v495
};

// BF_PORTAL_BLOCK_v495_LENDER_BOUNCE_SHOWN - BF-Server v494 reads bounce notices
// for lender package emails. A bounced send is not a send: say so in red.
const BOUNCE_TEXT: Record<string, string> = {
  bad_address: "address does not exist",
  mailbox_full: "mailbox full",
  too_large: "message too large",
  blocked: "blocked by the lender's mail server",
  rejected: "rejected by the lender's mail server",
};

export function describeBounce(entry: SentLenderEntry | null | undefined): string | null {
  const b = entry?.bounce;
  if (!b?.reason) return null;
  const why = BOUNCE_TEXT[b.reason] ?? "not delivered";
  const to = b.recipient ? ` (${b.recipient})` : "";
  return `✗ Email bounced - ${why}${to}. Fix the lender's submission email and send again.`;
}

export function describeDownloads(entry: SentLenderEntry | null | undefined): string | null {
  if (!entry?.viaLink) return null;
  const count = Number(entry.downloadCount ?? 0);
  if (!Number.isFinite(count) || count <= 0) return "Download link sent \u00b7 not downloaded yet";
  const last = entry.lastDownloadedAt ? new Date(entry.lastDownloadedAt) : null;
  const when = last && !Number.isNaN(last.getTime()) ? ` \u00b7 last ${last.toLocaleDateString()}` : "";
  return `Downloaded ${count}\u00d7${when}`;
}
