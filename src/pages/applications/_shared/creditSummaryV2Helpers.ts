// BF_PORTAL_BLOCK_v539_CREDIT_SUMMARY_V2 - formatting helpers for the new credit summary.
export type Section = { key: string; title: string; text: string; bullets?: string[]; risks?: { risk: string; mitigant: string }[]; edited?: boolean };
export type FinTable = { periods: { label: string; kind: string }[]; rows: { item: string; values: (number | null)[] }[] };
export type SummaryDoc = {
  dealType: "equipment" | "abl" | "term"; overview: Record<string, string | null>; financials: FinTable;
  equipment: { items: any[]; total: number | null } | null; receivables: any; sections: Section[];
  missing: string[]; warnings: string[]; unverifiedResearch: { id: string; label: string; value: string; url: string | null }[]; generatedAt: string;
};
export type SummaryRow = { doc: SummaryDoc; status: "draft" | "submitted"; submitted_by_name: string | null; submitted_at: string | null } | null;

export const OVERVIEW_ROWS: [string, string][] = [
  ["applicant_name", "Applicant Name"], ["address", "Address"], ["principals", "Principal(s)"], ["assets", "Assets"],
  ["transaction", "Transaction"], ["structure", "Structure"], ["asset_value", "Asset Value"], ["facility_request", "Facility Request"],
  ["term", "Term"], ["industry", "Industry"], ["ltv", "LTV"], ["additional_security", "Additional Collateral/Security"], ["website", "Website"],
];
export const ROW_LABELS: Record<string, string> = {
  revenue: "Revenue", gross_margin: "Gross Margin", ebitda: "EBITDA", ebitda_plus_rent: "EBITDA + Rent", net_income: "Income",
  total_debt_service: "Total Debt Service", dscr: "DSCR", current_assets: "Current Assets", current_liabilities: "Current Liabilities",
  current_ratio: "Liquidity (Current Ratio)", accounts_receivable: "Accounts Receivable", inventory: "Inventory", ppe_net: "Fixed Assets (PPE)",
  long_term_debt: "LT Debt", equity: "Equity", debt_to_equity: "Debt to Equity",
};
const RATIOS = new Set(["dscr", "current_ratio", "debt_to_equity"]);
export function money(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "";
  const value = `$${Math.round(Math.abs(n)).toLocaleString("en-US")}`;
  return n < 0 ? `(${value})` : value;
}
export function cell(item: string, value: number | null): string {
  if (value === null || value === undefined) return "";
  return RATIOS.has(item) ? `${value.toFixed(2)}x` : money(value);
}
export const bulletsToText = (items: string[] | undefined) => (items ?? []).join("\n");
export const textToBullets = (text: string) => text.split("\n").map((item) => item.replace(/^[-•*]\s*/, "").trim()).filter(Boolean);
export const risksToText = (risks: { risk: string; mitigant: string }[] | undefined) => (risks ?? []).map(({ risk, mitigant }) => `${risk} | ${mitigant}`).join("\n");
export const textToRisks = (text: string) => text.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
  const [risk, ...mitigant] = line.split("|");
  return { risk: risk!.trim(), mitigant: mitigant.join("|").trim() };
});
