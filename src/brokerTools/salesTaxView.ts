// BF_PORTAL_v865_BROKER_TOOLS_3_SALES_TAX - how a sales-tax rate reads on screen, and the calculator preview (same rounding and
// labels as KS-server src/brokerTools/salesTax.ts, so the preview matches what a quote adds).
export type TaxRate = { province: string; effective_from: string; gst: number; pst: number; hst: number; qst: number; note: string | null };
export type TaxLine = { label: string; amount: number };

const pct = (n: number) => `${Number(Number(n).toFixed(3))}%`;
const r2 = (n: number) => Math.round((n + Math.sign(n) * Number.EPSILON) * 100) / 100;

export function taxLines(amount: number, r: TaxRate): TaxLine[] {
  if (!(amount > 0)) return [];
  if (r.hst > 0) return [{ label: `HST ${pct(r.hst)}`, amount: r2((amount * r.hst) / 100) }];
  const out: TaxLine[] = [];
  if (r.gst > 0) out.push({ label: `GST ${pct(r.gst)}`, amount: r2((amount * r.gst) / 100) });
  if (r.pst > 0) out.push({ label: `${r.province === "MB" ? "RST" : "PST"} ${pct(r.pst)}`, amount: r2((amount * r.pst) / 100) });
  if (r.qst > 0) out.push({ label: `QST ${pct(r.qst)}`, amount: r2((amount * r.qst) / 100) });
  return out;
}

/** "HST 13%" or "GST 5% + PST 7%". */
export function rateSummary(r: TaxRate): string {
  const parts = taxLines(100, r).map((l) => l.label);
  return parts.length ? parts.join(" + ") : "No tax";
}

export function taxPreview(amount: number, r: TaxRate): { lines: TaxLine[]; total: number; withTax: number } {
  const lines = taxLines(amount, r);
  const total = r2(lines.reduce((s, l) => s + l.amount, 0));
  return { lines, total, withTax: r2((Number(amount) || 0) + total) };
}
