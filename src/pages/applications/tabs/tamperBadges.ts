// BF_PORTAL_TAMPER_BADGES_v270
// Shows BF-Server v269's automatic tamper scan. Advisory only: a signal is a
// reason to look closer, never a verdict. Clean, low, unavailable and error
// results show nothing so the list stays quiet.
export type TamperSignal = { code?: string; label?: string; severity?: string; detail?: string };
export type TamperFields = { tamperLevel?: string | null; tamperSignals?: unknown };

export function tamperSignals(doc: TamperFields): TamperSignal[] {
  return Array.isArray(doc.tamperSignals) ? (doc.tamperSignals as TamperSignal[]).filter((s) => s && typeof s === "object") : [];
}

export function tamperBadge(doc: TamperFields): { text: string; tone: "high" | "medium"; detail: string } | null {
  const level = String(doc.tamperLevel ?? "").toLowerCase();
  if (level !== "high" && level !== "medium") return null;
  const signals = tamperSignals(doc);
  const top = signals.find((s) => s.severity === level) ?? signals[0];
  const text = `⚠ Check document${top?.label ? `: ${top.label}` : ""}`;
  const detail = signals.length
    ? signals.map((s) => `• ${s.label ?? s.code ?? "Signal"}${s.detail ? ` - ${s.detail}` : ""}`).join("\n")
    : "The automatic scan found signs this file may have been edited.";
  return { text, tone: level, detail: `${detail}\n\nThis is a hint to look closer, not a finding of fraud.` };
}
