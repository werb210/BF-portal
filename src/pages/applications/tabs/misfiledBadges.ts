// BF_PORTAL_MISFILED_BADGES_v263
// Reads BF-Server v262's per-document OCR signal. Advisory only: nothing here
// moves, accepts or rejects a document. An older server sends none of these
// fields, so no badge appears.
export type MisfiledFields = {
  detectedLabel?: string | null;
  detectedConfidence?: number | null;
  looksMisfiled?: boolean;
  autoMovedFrom?: string | null;
};

export function misfiledBadgeText(doc: MisfiledFields): string | null {
  if (!doc.looksMisfiled || !doc.detectedLabel) return null;
  const pct = typeof doc.detectedConfidence === "number" && Number.isFinite(doc.detectedConfidence)
    ? ` (${Math.round(doc.detectedConfidence * 100)}%)`
    : "";
  return `Looks like ${doc.detectedLabel}${pct}`;
}

export function autoMovedText(doc: MisfiledFields): string | null {
  return doc.autoMovedFrom ? `Moved automatically from ${doc.autoMovedFrom}` : null;
}
