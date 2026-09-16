// BF_PORTAL_PRODUCT_CATEGORY_PICKER_v287
// Lenders are matched on the product category the applicant picked. When they
// pick the wrong one (Merchant Cash Advance instead of Term Loan), staff change
// it here; BF-Server v286 saves it, keeps a history, and re-matches lenders.
import { useState } from "react";
import { api } from "@/api";

export const PRODUCT_CATEGORY_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "TERM_LOAN", label: "Term Loan" },
  { value: "LINE_OF_CREDIT", label: "Line of Credit" },
  { value: "MERCHANT_CASH_ADVANCE", label: "Merchant Cash Advance" },
  { value: "EQUIPMENT_FINANCE", label: "Equipment Finance" },
  { value: "FACTORING", label: "Factoring" },
  { value: "PURCHASE_ORDER_FINANCE", label: "Purchase Order Finance" },
  { value: "ASSET_BASED_LENDING", label: "Asset-Based Lending" },
  { value: "SBA_GOVERNMENT", label: "SBA / Government" },
  { value: "STARTUP_CAPITAL", label: "Startup Capital" },
  { value: "MEDIA", label: "Media Funding" },
];

const ALIASES: Record<string, string> = {
  LOC: "LINE_OF_CREDIT", TERM: "TERM_LOAN", WORKING_CAPITAL: "TERM_LOAN", EQUIPMENT: "EQUIPMENT_FINANCE",
  EQUIPMENT_FINANCING: "EQUIPMENT_FINANCE", INVOICE_FACTORING: "FACTORING", PO: "PURCHASE_ORDER_FINANCE",
  PURCHASE_ORDER: "PURCHASE_ORDER_FINANCE", PURCHASE_ORDER_FINANCING: "PURCHASE_ORDER_FINANCE", MCA: "MERCHANT_CASH_ADVANCE",
  MEDIA_FUNDING: "MEDIA", ABL: "ASSET_BASED_LENDING", SBA: "SBA_GOVERNMENT", STARTUP: "STARTUP_CAPITAL",
};

/** The application's stored category as one of the options above, whatever form it was saved in. */
export function toCategoryOption(raw: unknown): string {
  const upper = String(raw ?? "").trim().toUpperCase().replace(/[\s\-/]+/g, "_");
  const value = ALIASES[upper] ?? upper;
  return PRODUCT_CATEGORY_OPTIONS.some((o) => o.value === value) ? value : "";
}

export default function ProductCategoryPicker(props: {
  applicationId: string;
  current: unknown;
  canEdit: boolean;
  onChanged: () => void | Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const value = toCategoryOption(props.current);

  const change = async (next: string) => {
    if (!next || next === value) return;
    const fromLabel = PRODUCT_CATEGORY_OPTIONS.find((o) => o.value === value)?.label ?? "the current category";
    const toLabel = PRODUCT_CATEGORY_OPTIONS.find((o) => o.value === next)?.label ?? next;
    if (!window.confirm(`Change this application from ${fromLabel} to ${toLabel}?\n\nLenders will be re-matched for ${toLabel}, and the required documents may change.`)) return;
    setSaving(true);
    setError(null);
    try {
      await api.post(`/api/applications/${encodeURIComponent(props.applicationId)}/product-category`, { category: next });
      await props.onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not change the product category.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div data-testid="product-category-picker" style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
      <label htmlFor="lenders-product-category" style={{ fontSize: 13, color: "var(--ui-text-muted)" }}>Product category</label>
      <select
        id="lenders-product-category"
        value={value}
        disabled={!props.canEdit || saving}
        onChange={(e) => void change(e.target.value)}
        style={{ fontSize: 14, padding: "6px 10px", borderRadius: 6, border: "1px solid var(--ui-border)", background: "var(--ui-surface-strong)", color: "var(--ui-text)" }}
      >
        {!value && <option value="">Not set</option>}
        {PRODUCT_CATEGORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {saving && <span style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>Re-matching lenders…</span>}
      {error && <span role="alert" style={{ fontSize: 12, color: "#b91c1c" }}>{error}</span>}
    </div>
  );
}
