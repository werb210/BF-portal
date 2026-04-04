export const OCR_INSIGHTS_CATEGORIES = [
    {
        id: "balance-sheet",
        label: "Balance Sheet",
        fieldKeys: ["bank_balance"]
    },
    {
        id: "income-statement",
        label: "Income Statement",
        fieldKeys: ["annual_revenue"]
    },
    {
        id: "cash-flow",
        label: "Cash Flow",
        fieldKeys: ["requested_amount"]
    },
    {
        id: "accounts-payable",
        label: "AP",
        fieldKeys: []
    },
    {
        id: "accounts-receivable",
        label: "AR",
        fieldKeys: ["invoice_total"]
    },
    {
        id: "inventory",
        label: "Inventory",
        fieldKeys: []
    },
    {
        id: "other",
        label: "Other",
        fieldKeys: ["business_name", "tax_id", "statement_date", "contract_start_date"]
    }
];
const categoryByFieldKey = new Map(OCR_INSIGHTS_CATEGORIES.flatMap((category) => category.fieldKeys.map((fieldKey) => [fieldKey, category.id])));
export const resolveOcrInsightsCategoryId = (fieldKey) => categoryByFieldKey.get(fieldKey) ?? "other";
export const getOcrInsightsCategoryLabel = (categoryId) => OCR_INSIGHTS_CATEGORIES.find((category) => category.id === categoryId)?.label ?? "Other";
