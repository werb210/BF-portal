// BF_PORTAL_BLOCK_v596_CURRENCY_SPLIT - CAD and USD kept apart, plus one CAD total.
export type ByCurrency = Record<string, number>;

export function formatSplit(by: ByCurrency | null | undefined): string {
  const parts = ([["CAD", "CA$"], ["USD", "US$"]] as const)
    .filter(([code]) => (by?.[code] ?? 0) !== 0)
    .map(([code, prefix]) => `${prefix}${Math.round(by?.[code] ?? 0).toLocaleString()}`);
  return parts.length ? parts.join(" + ") : "CA$0";
}

/** CAD total: USD converted at usdToCad. Null when there is USD but no rate to convert it. */
export function toCad(by: ByCurrency | null | undefined, usdToCad: number | null | undefined): number | null {
  const cad = by?.CAD ?? 0;
  const usd = by?.USD ?? 0;
  if (usd === 0) return Math.round(cad * 100) / 100;
  if (!usdToCad || !Number.isFinite(usdToCad)) return null;
  return Math.round((cad + usd * usdToCad) * 100) / 100;
}
