// BF_PORTAL_BLOCK_v594_SHARE_TO_DEAL - pure helpers for the share-to-deal sheet.
export type DealCard = { id: string; title: string; stage: string | null };

export function isSharedFileUrl(url: unknown): url is string {
  return typeof url === "string" && /^file:\/\//i.test(url.trim());
}

/** "file:///.../Shared/<uuid>-Bank%20Statement.pdf" -> "Bank Statement.pdf" */
export function sharedFileName(url: string): string {
  try {
    const last = decodeURIComponent(new URL(url).pathname.split("/").filter(Boolean).pop() ?? "");
    const clean = last.replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i, "");
    return clean || "shared-file";
  } catch {
    return "shared-file";
  }
}

const MIME: Record<string, string> = {
  pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", heic: "image/heic",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", xls: "application/vnd.ms-excel",
  csv: "text/csv", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", doc: "application/msword",
};
export function mimeFor(name: string): string {
  return MIME[(name.split(".").pop() ?? "").toLowerCase()] ?? "application/octet-stream";
}

/** /api/portal/applications rows -> cards; accepts a bare array or { items }. */
export function dealCards(response: unknown): DealCard[] {
  const list = Array.isArray(response) ? response
    : Array.isArray((response as { items?: unknown[] })?.items) ? (response as { items: unknown[] }).items : [];
  return (list as Array<Record<string, unknown>>)
    .filter((r) => r && r.id && (r.business_legal_name || r.name))
    .map((r) => ({ id: String(r.id), title: String(r.business_legal_name || r.name), stage: r.pipeline_state ? String(r.pipeline_state) : null }));
}

export function matchDeals(cards: DealCard[], query: string, limit = 12): DealCard[] {
  const q = query.trim().toLowerCase();
  if (!q) return cards.slice(0, limit);
  return cards.filter((c) => c.title.toLowerCase().includes(q)).slice(0, limit);
}
