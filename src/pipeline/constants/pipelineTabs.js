export const PIPELINE_TABS = [
    "Application",
    "Banking",
    "Financials",
    "Documents",
    "CreditSummary",
    "Notes",
    "Lenders"
];
export function validateTabOrder(tabs) {
    return JSON.stringify(tabs) === JSON.stringify(PIPELINE_TABS);
}
