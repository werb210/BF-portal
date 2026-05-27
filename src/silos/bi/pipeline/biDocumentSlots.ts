// BF_PORTAL_BLOCK_v657_CANONICAL_DOC_SLOTS_v1 — slot label mirror for
// staff UI. Replaces BI_DOC_LIST_v61's doc_slot vocabulary (pl_12mo,
// gov_id_*) with bi-server v379's canonical doc_type vocabulary —
// matches what's actually stored on bi_documents.doc_type.

export type BiDocSlot =
  | "loan_agreement"
  | "profit_loss"
  | "balance_sheet"
  | "ar_aging"
  | "ap_aging"
  | "founder_cv"
  | "financial_forecast";

export type BiDocSlotMeta = { label: string; carrierBound: boolean };

export const BI_DOC_SLOT_META: Record<BiDocSlot, BiDocSlotMeta> = {
  loan_agreement:     { label: "Lender Agreement / Term Sheet",      carrierBound: true },
  profit_loss:        { label: "Profit & Loss Statement",            carrierBound: true },
  balance_sheet:      { label: "Balance Sheet",                      carrierBound: true },
  ar_aging:           { label: "A/R Aging Summary",                  carrierBound: true },
  ap_aging:           { label: "A/P Aging Summary",                  carrierBound: true },
  founder_cv:         { label: "Founder CV(s)",                      carrierBound: true },
  financial_forecast: { label: "Financial Forecast",                 carrierBound: true },
};

export function biDocSlotLabel(slot: string | null | undefined): string {
  if (!slot) return "(uncategorised)";
  const m = BI_DOC_SLOT_META[slot as BiDocSlot];
  return m ? m.label : slot;
}

export function biDocSlotIsCarrierBound(slot: string | null | undefined): boolean | null {
  if (!slot) return null;
  const m = BI_DOC_SLOT_META[slot as BiDocSlot];
  return m ? m.carrierBound : null;
}
