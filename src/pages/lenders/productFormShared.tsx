// PRODUCT_CORE_FIELDS_SHARED_v1 - single source for the lender-product form
// fields. Extracted from the staff "Create New Product" modal (LendersPage.tsx)
// so the lender self-service portal reuses the exact same field group instead
// of a bare copy. Staff-only fields (lender selector, required documents) stay
// in LendersPage; commission is toggled via showCommission.
import React from "react";
import { formatDollar } from "@/utils/format";

export const CATEGORY_ORDER = ["TERM_LOAN", "LINE_OF_CREDIT", "FACTORING", "EQUIPMENT_FINANCE", "PURCHASE_ORDER_FINANCE", "MERCHANT_CASH_ADVANCE", "MEDIA", "ASSET_BASED_LENDING", "SBA_GOVERNMENT", "STARTUP_CAPITAL"];

export const CATEGORY_LABELS: Record<string, string> = {
  TERM_LOAN: "Term Loans",
  LINE_OF_CREDIT: "Line of Credit",
  FACTORING: "Factoring",
  EQUIPMENT_FINANCE: "Equipment Finance",
  PURCHASE_ORDER_FINANCE: "Purchase Order Finance",
  MERCHANT_CASH_ADVANCE: "Merchant Cash Advance",
  MEDIA: "Media / Film Finance",
  ASSET_BASED_LENDING: "Asset Based Lending",
  SBA_GOVERNMENT: "SBA / Government",
  STARTUP_CAPITAL: "Startup Capital",
};

export const CATEGORY_LONG_TO_SHORT: Record<string, string> = {
  TERM_LOAN: "TERM",
  LINE_OF_CREDIT: "LOC",
  FACTORING: "FACTORING",
  EQUIPMENT_FINANCE: "EQUIPMENT",
  PURCHASE_ORDER_FINANCE: "PO",
  MERCHANT_CASH_ADVANCE: "MCA",
  MEDIA: "MEDIA",
  ASSET_BASED_LENDING: "ABL",
  SBA_GOVERNMENT: "SBA",
  STARTUP_CAPITAL: "STARTUP",
};

export const CATEGORY_SHORT_TO_LONG: Record<string, string> = Object.fromEntries(
  Object.entries(CATEGORY_LONG_TO_SHORT).map(([longCode, shortCode]) => [shortCode, longCode])
);

export const CREDIT_SCORE_BANDS = [
  { label: "Under 560", lower: 0 },
  { label: "561 to 600", lower: 561 },
  { label: "600 to 660", lower: 600 },
  { label: "661 to 720", lower: 661 },
  { label: "Over 720", lower: 720 },
] as const;

export function bfBandFromMin(min: number | null | undefined): string {
  if (min == null) return "";
  const exact = CREDIT_SCORE_BANDS.find((b) => b.lower === min);
  if (exact) return exact.label;
  const below = [...CREDIT_SCORE_BANDS].reverse().find((b) => b.lower <= min);
  return below?.label ?? "";
}

export function bfMinFromBand(label: string): number | null {
  const found = CREDIT_SCORE_BANDS.find((b) => b.label === label);
  return found ? found.lower : null;
}

export type ProductCoreForm = {
  productName: string;
  category: string;
  country: string;
  minAmount: string;
  maxAmount: string;
  rateKind: "apr" | "monthly" | "factor";
  minRate: string;
  maxRate: string;
  ratePeriodDays: string;
  termMin: string;
  termMax: string;
  commission: string;
  creditBand: string;
  eligibilityNotes: string;
};

const inputStyle = (hasError?: boolean): React.CSSProperties => ({
  width: "100%", padding: "10px 14px", border: `1px solid ${hasError ? "#ef4444" : "var(--ui-border)"}`,
  borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box", color: "var(--ui-text)", background: "var(--ui-surface-strong)",
});
const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: "var(--ui-text)", display: "block", marginBottom: 6 };
const errorStyle: React.CSSProperties = { fontSize: 12, color: "#ef4444", marginTop: 3 };
const chevron: React.CSSProperties = {
  appearance: "none",
  backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E\")",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 12px center",
  backgroundSize: 18,
};
const DASH = "\u2014";

export function ProductCoreFields({ form, set, errors, showCommission = false }: { form: ProductCoreForm; set: (key: string, value: string | boolean) => void; errors: Record<string, string>; showCommission?: boolean; }) {
  return <>
    <div><label style={labelStyle}>Product Name <span style={{ color: "#ef4444" }}>*</span></label><input placeholder="Enter product name" value={form.productName} onChange={(e) => set("productName", e.target.value)} style={inputStyle(!!errors.productName)} />{errors.productName && <p style={errorStyle}>{errors.productName}</p>}</div>
    <div><label style={labelStyle}>Category <span style={{ color: "#ef4444" }}>*</span></label><select value={form.category} onChange={(e) => set("category", e.target.value)} style={{ ...inputStyle(), ...chevron }}>{CATEGORY_ORDER.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c] ?? c}</option>)}</select></div>
    <div><label style={labelStyle}>Country <span style={{ color: "#ef4444" }}>*</span></label><select value={form.country} onChange={(e) => set("country", e.target.value)} style={{ ...inputStyle(), ...chevron }}><option value="CA">Canada</option><option value="US">United States</option><option value="BOTH">Both (Canada &amp; US)</option></select></div>
    <div><label style={labelStyle}>Amount Range <span style={{ color: "#ef4444" }}>*</span></label><div style={{ display: "flex", alignItems: "center", gap: 12 }}><input placeholder="Minimum amount" value={form.minAmount} onChange={(e) => set("minAmount", formatDollar(e.target.value))} style={{ ...inputStyle(!!errors.amount), flex: 1 }} /><span style={{ color: "var(--ui-text-muted)", fontSize: 18, flexShrink: 0 }}>{DASH}</span><input placeholder="Maximum amount" value={form.maxAmount} onChange={(e) => set("maxAmount", formatDollar(e.target.value))} style={{ ...inputStyle(), flex: 1 }} /></div>{errors.amount && <p style={errorStyle}>{errors.amount}</p>}</div>
    <div><label style={labelStyle}>Rate kind <span style={{ color: "#ef4444" }}>*</span></label><select value={form.rateKind} onChange={(e) => set("rateKind", e.target.value as "apr" | "monthly" | "factor")} style={{ ...inputStyle(), background: "var(--ui-surface-input)", width: "100%" }}><option value="apr">APR (annual %) {DASH} term loans / equipment / working capital</option><option value="monthly">Monthly % {DASH} factoring / AR / PO / ABL</option><option value="factor">Factor (MCA payback, e.g. 1.24x)</option></select></div>
    <div><label style={labelStyle}>{form.rateKind === "factor" ? "Payback factor range" : form.rateKind === "monthly" ? "Rate range (% per month)" : "Rate range (% APR)"} <span style={{ color: "#ef4444" }}>*</span></label><div style={{ display: "flex", alignItems: "center", gap: 12 }}><input placeholder={form.rateKind === "factor" ? "e.g. 1.24" : form.rateKind === "monthly" ? "e.g. 1.0" : "e.g. 4.99"} value={form.minRate} onChange={(e) => set("minRate", e.target.value)} style={{ ...inputStyle(), flex: 1 }} type="text" inputMode="decimal" /><span style={{ color: "var(--ui-text-muted)", fontSize: 18, flexShrink: 0 }}>{DASH}</span><input placeholder={form.rateKind === "factor" ? "e.g. 1.45" : form.rateKind === "monthly" ? "e.g. 3.0" : "e.g. 19.99"} value={form.maxRate} onChange={(e) => set("maxRate", e.target.value)} style={{ ...inputStyle(), flex: 1 }} type="text" inputMode="decimal" /></div>{(form.rateKind === "monthly" || form.rateKind === "factor") && <div style={{ marginTop: 8 }}><label style={{ ...labelStyle, fontSize: 12, color: "var(--ui-text-muted)" }}>Rate period (days) {DASH} optional; defaults: 30 monthly, 180 factor</label><input placeholder={form.rateKind === "factor" ? "180" : "30"} value={form.ratePeriodDays} onChange={(e) => set("ratePeriodDays", e.target.value)} style={{ ...inputStyle(), width: "100%" }} type="text" inputMode="numeric" /></div>}</div>
    <div><label style={labelStyle}>Term <span style={{ color: "var(--ui-text-muted)", fontWeight: 400 }}>(months)</span></label><div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 8, alignItems: "center" }}><input placeholder="e.g. 6" inputMode="numeric" value={form.termMin} onChange={(e) => set("termMin", e.target.value.replace(/[^0-9]/g, ""))} style={inputStyle()} /><span style={{ color: "var(--ui-text-muted)" }}>{DASH}</span><input placeholder="e.g. 24" inputMode="numeric" value={form.termMax} onChange={(e) => set("termMax", e.target.value.replace(/[^0-9]/g, ""))} style={inputStyle()} /></div></div>
    {showCommission && <div><label style={labelStyle}>Commission <span style={{ color: "var(--ui-text-muted)", fontWeight: 400 }}>(%, internal)</span></label><input placeholder="e.g. 1.5" inputMode="decimal" value={form.commission} onChange={(e) => set("commission", e.target.value.replace(/[^0-9.]/g, ""))} style={inputStyle()} /></div>}
    <div><label style={labelStyle}>Minimum Credit Score</label><select value={form.creditBand} onChange={(e) => set("creditBand", e.target.value)} style={inputStyle()}><option value="">No minimum</option>{CREDIT_SCORE_BANDS.map((b) => <option key={b.label} value={b.label}>{b.label}</option>)}</select></div>
    <div><label style={labelStyle}>Eligibility notes</label><textarea rows={3} placeholder="Industry, time in business, revenue minimums, exclusions..." value={form.eligibilityNotes} onChange={(e) => set("eligibilityNotes", e.target.value)} style={{ ...inputStyle(), resize: "vertical", fontFamily: "inherit" }} /></div>
  </>;
}
