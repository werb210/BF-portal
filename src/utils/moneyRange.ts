// BF_PORTAL_BLOCK_v864_MONEY_RANGE — banded/range values from the client wizard
// dropdowns (e.g. "$500,001 to $1,000,000", "$50,000 to $100,000") are already
// human-readable strings. The previous money formatter stripped every non-digit
// and concatenated the two bounds into a meaningless number (e.g.
// "$500,001 to $1,000,000" -> $5,000,011,000,000). Detect ranges/bands and pass
// them through verbatim; format genuine scalar values as currency.
export function formatMoneyOrRange(v: unknown, fallback = "—"): string {
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return fallback;
    const isRange =
      /\d[\d,]*\s*(?:to|through|–|—)\s*\$?\s*\d/i.test(s) ||
      /\b(or more|or less|less than|under|over|up to)\b/i.test(s) ||
      /\d\s*\+/.test(s);
    if (isRange) return s;
  }
  let n = NaN;
  if (typeof v === "number") n = v;
  else if (typeof v === "string") n = Number(v.replace(/[^0-9.\-]/g, ""));
  return !Number.isFinite(n) || n <= 0 ? fallback : `$${Math.round(n).toLocaleString()}`;
}
