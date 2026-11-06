// BF_PORTAL_v907_PARTIAL_BULK_DELETE - BF-Server v907 deletes what it can from a mass delete and lists the rest with
// the reason ("has applications", "kept on record"...). Turn that into one plain message.
export type SkippedRecord = { id: string; name?: string | null; reason: string };

export function skippedFrom(value: unknown): SkippedRecord[] {
  const v = value as { skipped?: unknown; details?: { skipped?: unknown } } | null;
  const list = Array.isArray(v?.skipped) ? v!.skipped : Array.isArray(v?.details?.skipped) ? v!.details!.skipped : [];
  return (list as any[]).filter((x) => x && typeof x.id === "string").map((x) => ({ id: x.id, name: x.name ?? null, reason: String(x.reason ?? "could not be deleted") }));
}

export function bulkDeleteMessage(kind: "contact" | "company", deleted: number, skipped: SkippedRecord[]): string {
  const noun = (n: number) => `${n} ${kind === "contact" ? (n === 1 ? "contact" : "contacts") : n === 1 ? "company" : "companies"}`;
  const head = deleted > 0 ? `Deleted ${noun(deleted)}.` : `No ${kind === "contact" ? "contacts" : "companies"} were deleted.`;
  if (!skipped.length) return head;
  const shown = skipped.slice(0, 15).map((s) => `- ${s.name || s.id}: ${s.reason}`).join("\n");
  const more = skipped.length > 15 ? `\n...and ${skipped.length - 15} more.` : "";
  return `${head}\n\n${noun(skipped.length)} not deleted:\n${shown}${more}`;
}
