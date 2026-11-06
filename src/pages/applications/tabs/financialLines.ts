// BF_PORTAL_v906_FINANCIAL_LINES - the Financials tab shows standard financial statement lines in a fixed order.
// OCR also returns fields such as Email, Invoice Date, Terms, Title, Business Name and Company Start Date; those are
// not financial figures, so they go in a small "Document details" block instead of rows of the statement table.

export type FinancialLine = { key: string; label: string };

/** Display order (income statement, then balance sheet). */
export const FINANCIAL_LINES: FinancialLine[] = [
  { key: "revenue", label: "Revenue" },
  { key: "cogs", label: "Cost of goods sold" },
  { key: "gross_profit", label: "Gross profit" },
  { key: "expenses", label: "Operating expenses" },
  { key: "ebitda", label: "EBITDA" },
  { key: "depreciation", label: "Depreciation and amortization" },
  { key: "interest", label: "Interest expense" },
  { key: "net_income", label: "Net income" },
  { key: "cash", label: "Cash" },
  { key: "ar", label: "Accounts receivable" },
  { key: "inventory", label: "Inventory" },
  { key: "current_assets", label: "Current assets" },
  { key: "fixed_assets", label: "Fixed assets / equipment" },
  { key: "total_assets", label: "Total assets" },
  { key: "ap", label: "Accounts payable" },
  { key: "current_liabilities", label: "Current liabilities" },
  { key: "current_ltd", label: "Current portion of long-term debt" },
  { key: "long_term_debt", label: "Long-term debt" },
  { key: "total_liabilities", label: "Total liabilities" },
  { key: "equity", label: "Equity" },
  { key: "retained_earnings", label: "Retained earnings" },
];

// Matching order: the more specific wording first ("total current assets" before "total assets", "net income" before
// "income", "current portion of long-term debt" before "long-term debt").
const RULES: Array<[string, RegExp]> = [
  ["retained_earnings", /retained earnings/],
  ["current_ltd", /current portion|\bcpltd\b/],
  ["current_assets", /current assets/],
  ["current_liabilities", /current liabilities/],
  ["total_liabilities", /^total liabilities$|total liabilities(?! and)/],
  ["total_assets", /total assets/],
  ["long_term_debt", /long[ -]?term (debt|liabilities|loans?)|term loans?|\bltd\b/],
  ["net_income", /net (income|profit|earnings|loss)|net income loss|profit (for|after)/],
  ["gross_profit", /gross (profit|margin)/],
  ["ebitda", /ebitda/],
  ["depreciation", /depreciation|amortization|amortisation/],
  ["interest", /interest expense|interest on/],
  ["cogs", /cost of (goods sold|sales|revenue)|\bcogs\b|direct costs?/],
  ["expenses", /(operating|total|general and admin|admin|g a) ?(costs|expenses)|^expenses$|overhead/],
  ["revenue", /^(total )?(revenue|revenues|sales|gross sales|net sales|total income|gross income|turnover|income)$|^revenue|total revenue/],
  ["cash", /^cash\b|cash on hand|cash and (cash )?equivalents|bank balance/],
  ["ar", /accounts? receivable|^a ?r$|^receivables?$|trade receivables/],
  ["inventory", /inventor/],
  ["fixed_assets", /fixed assets|property,? plant|capital assets|equipment( value)?$|equipment net/],
  ["ap", /accounts? payable|^a ?p$|^payables?$|trade payables/],
  ["equity", /(shareholders?|owners?|stockholders?|total) ?equity$|^equity$|share capital/],
];

export function normalizeLabel(text: string | null | undefined): string {
  return String(text ?? "").toLowerCase().replace(/&/g, " and ").replace(/[_/'’.,:()-]+/g, " ").replace(/\s+/g, " ").trim();
}

/** The standard line a field belongs to, or null when it is not a financial figure. */
export function financialLineFor(displayLabel: string | null | undefined, fieldKey?: string | null): FinancialLine | null {
  for (const candidate of [normalizeLabel(displayLabel), normalizeLabel(fieldKey)]) {
    if (!candidate) continue;
    for (const [key, re] of RULES) {
      if (re.test(candidate)) return FINANCIAL_LINES.find((l) => l.key === key) ?? null;
    }
  }
  return null;
}
