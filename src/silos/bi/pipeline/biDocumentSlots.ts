// BI_DOC_LIST_v61 — slot label mirror for staff UI. Source of truth lives
// on BI-Server. Keep in sync.

export type BiDocSlot =
  | "pl_12mo" | "balance_sheet" | "ar_aging" | "ap_aging"
  | "founder_cv" | "forecast"
  | "gov_id_primary" | "gov_id_secondary";

export type BiDocSlotMeta = { label: string; carrierBound: boolean };

export const BI_DOC_SLOT_META: Record<BiDocSlot, BiDocSlotMeta> = {
  pl_12mo:           { label: "P&L (12 months)",                 carrierBound: true  },
  balance_sheet:     { label: "Balance Sheet",                   carrierBound: true  },
  ar_aging:          { label: "A/R Aging",                       carrierBound: true  },
  ap_aging:          { label: "A/P Aging",                       carrierBound: true  },
  founder_cv:        { label: "Founder CV(s)",                   carrierBound: true  },
  forecast:          { label: "Financial Forecasts",             carrierBound: true  },
  gov_id_primary:    { label: "ID — Driver's Licence (KYC)",     carrierBound: false },
  gov_id_secondary:  { label: "ID — Passport/Other (KYC)",       carrierBound: false },
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
