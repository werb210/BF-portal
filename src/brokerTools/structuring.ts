// BF_PORTAL_v867_BROKER_TOOLS_RATE_CARDS - how payment options read on screen (shared by the Deal desk and the vendor portal).
export type TaxLine = { label: string; amount: number };
export type PaymentOption = {
  card_id: string; lender_name: string | null; product_name: string | null; card_name: string; rate_kind: "apr" | "factor"; rate: number; tier: string;
  term_months: number; financed: number; residual: number; payment: number; payment_tax: TaxLine[]; payment_with_tax: number;
  upfront: { label: string; amount: number }[]; upfront_total: number; total_of_payments: number; cost_of_borrowing: number;
};

export const PROVINCES = ["AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT"] as const;
export const TAX_MODE_LABEL: Record<string, string> = {
  lease: "Lease: tax on each payment", financed: "Loan: tax financed with the equipment", upfront: "Loan: tax paid up front", none: "No sales tax",
};

/** "8.9% APR" or "factor 1.30". */
export function rateText(o: Pick<PaymentOption, "rate_kind" | "rate">): string {
  return o.rate_kind === "factor" ? `factor ${o.rate.toFixed(2)}` : `${Number(o.rate.toFixed(3))}% APR`;
}

/** One row per lender card, one column per term: the grid staff and vendors compare. */
export function optionGrid(options: PaymentOption[]): { terms: number[]; rows: { key: string; label: string; cells: Record<number, { option: PaymentOption; index: number } | undefined> }[] } {
  const terms = [...new Set(options.map((o) => o.term_months))].sort((a, b) => a - b);
  const rows = new Map<string, { key: string; label: string; cells: Record<number, { option: PaymentOption; index: number } | undefined> }>();
  options.forEach((o, index) => {
    const key = o.card_id;
    if (!rows.has(key)) rows.set(key, { key, label: `${o.lender_name ?? "Lender"} - ${o.product_name ?? o.card_name}`, cells: {} });
    rows.get(key)!.cells[o.term_months] = { option: o, index };
  });
  const cheapest = (r: { cells: Record<number, { option: PaymentOption } | undefined> }) => Math.min(...Object.values(r.cells).map((c) => c?.option.payment_with_tax ?? Infinity));
  return { terms, rows: [...rows.values()].sort((a, b) => cheapest(a) - cheapest(b)) };
}
