// CRM_CSV_EXPORT — generic client-side CSV export for CRM list views.
// Builds a CSV from whatever rows are currently loaded and triggers a download.
// Arrays are joined with "; "; objects are JSON-stringified; null/undefined -> "".
export function exportRowsToCsv(
  filename: string,
  rows: Array<Record<string, unknown>>,
): void {
  if (!Array.isArray(rows) || rows.length === 0) return;
  const cols = Array.from(
    rows.reduce((set: Set<string>, r) => {
      Object.keys(r ?? {}).forEach((k) => set.add(k));
      return set;
    }, new Set<string>()),
  );
  const esc = (v: unknown): string => {
    if (v == null) return "";
    const s = Array.isArray(v)
      ? v.join("; ")
      : typeof v === "object"
        ? JSON.stringify(v)
        : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    cols.join(","),
    ...rows.map((r) => cols.map((c) => esc((r as Record<string, unknown>)[c])).join(",")),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
