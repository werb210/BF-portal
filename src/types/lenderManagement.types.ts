export const LENDER_PRODUCT_CATEGORIES = [
  "TERM_LOAN",
  "LINE_OF_CREDIT",
  "FACTORING",
  "EQUIPMENT_FINANCE",
  "PURCHASE_ORDER_FINANCE",
  "MERCHANT_CASH_ADVANCE",
  "ASSET_BASED_LENDING",
  "SBA_GOVERNMENT",
  "STARTUP_CAPITAL"
] as const;

export type LenderProductCategory = (typeof LENDER_PRODUCT_CATEGORIES)[number];

export const LENDER_PRODUCT_CATEGORY_LABELS: Record<LenderProductCategory, string> = {
  TERM_LOAN: "Term loan",
  LINE_OF_CREDIT: "Line of credit",
  FACTORING: "Factoring",
  EQUIPMENT_FINANCE: "Equipment finance",
  PURCHASE_ORDER_FINANCE: "Purchase order finance",
  MERCHANT_CASH_ADVANCE: "Merchant cash advance",
  ASSET_BASED_LENDING: "Asset based lending",
  SBA_GOVERNMENT: "SBA / Government",
  STARTUP_CAPITAL: "Startup capital (Not live)"
};

export const isLenderProductCategory = (value: string): value is LenderProductCategory =>
  (LENDER_PRODUCT_CATEGORIES as readonly string[]).includes(value);

export const DOCUMENT_TYPES = [
  "business_bank_statements",
  "accountant_prepared_financials",
  "interim_profit_and_loss",
  "interim_balance_sheet",
  "cash_flow_projections",
  "business_tax_returns",
  "personal_tax_returns",
  "personal_credit_report",
  "business_credit_report",
  "ar_aging",
  "ap_aging",
  "customer_list",
  "invoices",
  "vendor_quote_invoice",
  "purchase_order_or_invoice_of_equipment",
  "identity_documents",
  "net_worth_statement"
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  business_bank_statements: "Business bank statements",
  accountant_prepared_financials: "Accountant-prepared financials (multi-year)",
  interim_profit_and_loss: "Interim P&L",
  interim_balance_sheet: "Interim Balance Sheet",
  cash_flow_projections: "Cash flow projections",
  business_tax_returns: "Business tax returns",
  personal_tax_returns: "Personal tax returns",
  personal_credit_report: "Personal credit report",
  business_credit_report: "Business credit report",
  ar_aging: "A/R aging",
  ap_aging: "A/P aging",
  customer_list: "Customer list",
  invoices: "Invoices",
  vendor_quote_invoice: "Vendor quote / invoice",
  purchase_order_or_invoice_of_equipment: "Purchase Order or Invoice of Equipment",
  identity_documents: "Identity documents",
  net_worth_statement: "Net worth statement"
};

export const RATE_TYPES = ["fixed", "variable", "factor"] as const;
export type RateType = (typeof RATE_TYPES)[number];

export const TERM_UNITS = ["months", "years"] as const;
export type TermUnit = (typeof TERM_UNITS)[number];

export const SUBMISSION_METHODS = ["GOOGLE_SHEET", "EMAIL", "API", "MANUAL"] as const;
export type SubmissionMethod = (typeof SUBMISSION_METHODS)[number];
