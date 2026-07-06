import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom"; // LENDER_PRODUCT_NOTIF_DEEPLINK_v1
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchLenders,
  createLender,
  createLenderProduct,
  updateLender,
  updateLenderProduct,
  fetchLenderProductById,
  fetchLenderProducts,
  type Lender,
  type LenderProduct,
} from "@/api/lenders";
import { getErrorMessage } from "@/utils/errors";
import { api } from "@/api";
import ModalFooterWithDelete from "@/components/ModalFooterWithDelete";
import { useDocumentTypes } from "@/hooks/useDocumentTypes";
import { phoneInputHandler, formatDollar, formatRate, unformatDollar } from "@/utils/format";
import { CATEGORY_ORDER, CATEGORY_LABELS, CREDIT_SCORE_BANDS, bfBandFromMin, bfMinFromBand, ProductCoreFields } from "./productFormShared"; // PRODUCT_CORE_FIELDS_SHARED_v1


// ─── Types ────────────────────────────────────────────────────────────────────
type SubmissionMethod = "EMAIL" | "API" | "GOOGLE_SHEET";

const SUBMISSION_LABELS: Record<SubmissionMethod, string> = {
  EMAIL: "Email",
  API: "API",
  GOOGLE_SHEET: "Google Sheet (Merchant Growth)",
};


// BF_LENDER_ROW_EDIT_v24
async function bfSaveLender(lenderId: string, payload: Parameters<typeof updateLender>[1]) {
  return updateLender(lenderId, payload);
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ active, status }: { active?: boolean; status?: string }) {
  const normalizedStatus = typeof status === "string" ? status.toUpperCase() : undefined;
  const isActive = normalizedStatus === "ACTIVE" || active === true;
  const isInactive = normalizedStatus === "INACTIVE" || active === false;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 10px",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 600,
        background: isActive ? "#22c55e22" : isInactive ? "var(--ui-border)" : "var(--ui-border)",
        color: isActive ? "#16a34a" : isInactive ? "var(--ui-text-muted)" : "var(--ui-text-muted)",
        border: `1px solid ${isActive ? "#22c55e44" : "var(--ui-border)"}`,
        whiteSpace: "nowrap",
      }}
    >
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

// ─── Submission Method dropdown ───────────────────────────────────────────────
function SubmissionDropdown({
  value,
  onChange,
}: {
  value: SubmissionMethod;
  onChange: (v: SubmissionMethod) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%", padding: "10px 14px", border: "1px solid var(--ui-border)",
          borderRadius: 8, background: "var(--ui-surface-strong)", textAlign: "left", fontSize: 14,
          color: value ? "var(--ui-text)" : "var(--ui-text-muted)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          cursor: "pointer",
        }}
      >
        <span>{value ? SUBMISSION_LABELS[value] : "Select method..."}</span>
        <span style={{ color: "var(--ui-text-muted)" }}>▾</span>
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
          background: "var(--ui-surface-strong)", border: "1px solid var(--ui-border)", borderRadius: 8,
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)", zIndex: 100, padding: "8px 0",
        }}>
          {(["EMAIL", "API", "GOOGLE_SHEET"] as SubmissionMethod[]).map((method) => (
            <label
              key={method}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 14px", cursor: "pointer", fontSize: 14,
                color: "var(--ui-text)",
              }}
            >
              <input
                type="checkbox"
                checked={value === method}
                onChange={() => { onChange(method); setOpen(false); }}
                style={{ width: 16, height: 16 }}
              />
              <span>{SUBMISSION_LABELS[method]}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Create Lender Modal ──────────────────────────────────────────────────────
function CreateLenderModal({
  onClose,
  onCreated,
  lender,
}: {
  onClose: () => void;
  onCreated: (lender: Lender) => void;
  lender?: Lender | null;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: lender?.name ?? "",
    applicationUrl: ((lender as any)?.applicationUrl ?? (lender as any)?.application_url ?? "") as string,
    announcement: ((lender as any)?.announcement ?? "") as string,
    street: lender?.address?.street ?? "",
    city: lender?.address?.city ?? "",
    region: "",
    postalCode: "",
    country: ((lender as any)?.country ?? lender?.address?.country ?? "CA") as string,
    phone: lender?.phone ?? "",
    contactName: lender?.primaryContact?.name ?? "",
    contactPhone: lender?.primaryContact?.phone ?? "",
    contactEmail: lender?.primaryContact?.email ?? "",
    website: ((lender as any)?.website ?? "") as string, // STAFF_LENDER_WEB_DESC_v1
    description: ((lender as any)?.description ?? "") as string, // STAFF_LENDER_WEB_DESC_v1
    submissionMethod: (lender?.submissionConfig?.method as SubmissionMethod | undefined) ?? "",
    submissionEmail: lender?.submissionConfig?.submissionEmail ?? "",
    apiEndpoint: lender?.submissionConfig?.apiBaseUrl ?? "",
    apiKey: lender?.submissionConfig?.apiPassword ?? "",
    sheetId: lender?.submissionConfig?.sheetId ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  function set(key: string, value: string) {
    setForm((p) => ({ ...p, [key]: value }));
    setErrors((p) => { const n = { ...p }; delete n[key]; return n; });
  }

  async function handleDelete(): Promise<void> {
    if (!lender?.id) return;
    setSaving(true);
    setServerError(null);
    try {
      await api.delete(`/api/portal/lenders/${lender.id}`);
      await queryClient.invalidateQueries({ queryKey: ["lenders"] });
      onClose();
    } catch (err) {
      const status = (err as { status?: number })?.status;
      const details = (err as { details?: { code?: string; message?: string; productsCount?: number } })?.details;
      const message = getErrorMessage(err, "Delete failed.");
      const code = String(details?.code ?? "");
      const isForeignKey = (status === 500 && code.startsWith("23")) || /foreign key/i.test(message) || /foreign key/i.test(details?.message ?? "");
      if (isForeignKey) {
        const count = Number(details?.productsCount ?? 0) || 0;
        setServerError(`Cannot delete: this lender has ${count} products. Delete the products first, or use Edit to mark the lender inactive.`);
      } else {
        setServerError(message);
      }
    } finally {
      setSaving(false);
    }
  }

  async function submit() {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Lender name is required.";
    if (!form.phone.trim()) next.phone = "Phone number is required.";
    if (!form.contactName.trim()) next.contactName = "Contact person is required.";
    if (!form.contactEmail.trim()) next.contactEmail = "Contact email is required.";
    if (!form.submissionMethod) next.submissionMethod = "Submission method is required.";
    if (Object.keys(next).length) { setErrors(next); return; }

    setSaving(true);
    setServerError(null);
    try {
      const payload = {
        name: form.name.trim(),
        application_url: form.applicationUrl.trim() || null,
        announcement: form.announcement.trim() || null,
        website: form.website.trim() || null, // STAFF_LENDER_WEB_DESC_v1
        description: form.description.trim() || null, // STAFF_LENDER_WEB_DESC_v1
        street: form.street.trim() || null,
        city: form.city.trim() || null,
        region: form.region.trim() || null,
        postalCode: form.postalCode.trim() || null,
        country: form.country,
        phone: form.phone.trim(),
        submissionMethod: form.submissionMethod as SubmissionMethod,
        submissionEmail: form.submissionMethod === "EMAIL" ? (form.submissionEmail.trim() || null) : null,
        apiEndpoint: form.submissionMethod === "API" ? (form.apiEndpoint.trim() || null) : null,
        apiKey: form.submissionMethod === "API" ? (form.apiKey.trim() || null) : null,
        sheetId: form.submissionMethod === "GOOGLE_SHEET" ? (form.sheetId.trim() || null) : null,
        primaryContact: {
          name: form.contactName.trim(),
          phone: form.contactPhone.trim() || null,
          email: form.contactEmail.trim(),
        },
        primaryContactName: form.contactName.trim(),
        primaryContactEmail: form.contactEmail.trim(),
        primaryContactPhone: form.contactPhone.trim() || null,
        active: true,
        status: "ACTIVE",
      } as any;
      const saved = lender?.id ? await bfSaveLender(lender.id, payload) : await createLender(payload);
      onCreated(saved);
    } catch (err) {
      setServerError(getErrorMessage(err, "Failed to create lender."));
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = (hasError?: boolean): React.CSSProperties => ({
    width: "100%", padding: "10px 14px", border: `1px solid ${hasError ? "#ef4444" : "var(--ui-border)"}`,
    borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box", color: "var(--ui-text)",
    background: "var(--ui-surface-strong)",
  });

  const labelStyle: React.CSSProperties = {
    fontSize: 13, fontWeight: 600, color: "var(--ui-text)", display: "block", marginBottom: 6,
  };

  const errorStyle: React.CSSProperties = { fontSize: 12, color: "#ef4444", marginTop: 3 };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.5)" }} onClick={onClose} />
      <div style={{
        position: "relative", background: "var(--ui-surface-strong)", borderRadius: 16, width: "min(680px, 95vw)",
        maxHeight: "90vh", overflowY: "auto", padding: 32, boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
      }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", fontSize: 22, color: "var(--ui-text-muted)", cursor: "pointer" }}>×</button>
        <h2 style={{ margin: "0 0 24px", fontSize: 22, fontWeight: 700, color: "var(--ui-text)" }}>{lender ? "Edit Lender" : "Create New Lender"}</h2>

        {serverError && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#dc2626", fontSize: 13 }}>
            {serverError}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Lender Name */}
          <div>
            <label style={labelStyle}>Lender Name <span style={{ color: "#ef4444" }}>*</span></label>
            <input placeholder="Enter lender name" value={form.name} onChange={(e) => set("name", e.target.value)}
              style={inputStyle(!!errors.name)} />
            {errors.name && <p style={errorStyle}>{errors.name}</p>}
          </div>

          {/* BF_PORTAL_BLOCK_vC — Application URL + Announcement */}
          <div>
            <label style={labelStyle}>Application URL</label>
            <input placeholder="https://lender.com/apply" value={form.applicationUrl} onChange={(e) => set("applicationUrl", e.target.value)} style={{ ...inputStyle(), marginBottom: 8 }} />
            <label style={labelStyle}>Announcement</label>
            <input placeholder="Short note shown with this lender" value={form.announcement} onChange={(e) => set("announcement", e.target.value)} style={inputStyle()} />
          </div>

          {/* STAFF_LENDER_WEB_DESC_v1 - parity with lender portal Edit Company form */}
          <div>
            <label style={labelStyle}>Website</label>
            <input placeholder="www.lender.com" value={form.website} onChange={(e) => set("website", e.target.value)} style={{ ...inputStyle(), marginBottom: 8 }} />
            <label style={labelStyle}>Description</label>
            <textarea rows={3} placeholder="Short description of this lender" value={form.description} onChange={(e) => set("description", e.target.value)} style={{ ...inputStyle(), resize: "vertical", fontFamily: "inherit" }} />
          </div>

          {/* Lender Address */}
          <div>
            <label style={labelStyle}>Lender Address <span style={{ color: "#ef4444" }}>*</span></label>
            <input placeholder="Enter street address" value={form.street} onChange={(e) => set("street", e.target.value)}
              style={{ ...inputStyle(), marginBottom: 8 }} />
            <input placeholder="City" value={form.city} onChange={(e) => set("city", e.target.value)}
              style={{ ...inputStyle(), marginBottom: 8 }} />
            <input placeholder="State / Province" value={form.region} onChange={(e) => set("region", e.target.value)}
              style={{ ...inputStyle(), marginBottom: 8 }} />
            <input placeholder="ZIP / Postal Code" value={form.postalCode} onChange={(e) => set("postalCode", e.target.value)}
              style={{ ...inputStyle(), marginBottom: 8 }} />
            <select value={form.country} onChange={(e) => set("country", e.target.value)} style={inputStyle()}>
              <option value="CA">Canada</option>
              <option value="US">United States</option>
              <option value="BOTH">Both (CA + US)</option>
            </select>
          </div>

          {/* Phone */}
          <div>
            <label style={labelStyle}>Lender Main Phone Number <span style={{ color: "#ef4444" }}>*</span></label>
            <input placeholder="(___) ___–____" value={form.phone} onChange={(e) => phoneInputHandler(e.target.value, (v) => set("phone", v))}
              style={inputStyle(!!errors.phone)} />
            {errors.phone && <p style={errorStyle}>{errors.phone}</p>}
          </div>

          {/* Primary Contact */}
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: "var(--ui-text)", margin: "4px 0 12px" }}>Primary Contact</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>Contact Person <span style={{ color: "#ef4444" }}>*</span></label>
                <input placeholder="Enter contact name" value={form.contactName} onChange={(e) => set("contactName", e.target.value)}
                  style={inputStyle(!!errors.contactName)} />
                {errors.contactName && <p style={errorStyle}>{errors.contactName}</p>}
              </div>
              <div>
                <label style={labelStyle}>Contact Phone Number (OTP) <span style={{ color: "#ef4444" }}>*</span></label>
                <input placeholder="(___) ___–____" value={form.contactPhone} onChange={(e) => phoneInputHandler(e.target.value, (v) => set("contactPhone", v))}
                  style={inputStyle()} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Contact Email <span style={{ color: "#ef4444" }}>*</span></label>
              <input placeholder="Enter contact email" value={form.contactEmail} onChange={(e) => set("contactEmail", e.target.value)}
                style={inputStyle(!!errors.contactEmail)} />
              {errors.contactEmail && <p style={errorStyle}>{errors.contactEmail}</p>}
            </div>
          </div>

          {/* Submission Method */}
          <div>
            <label style={labelStyle}>Submission Method <span style={{ color: "#ef4444" }}>*</span></label>
            <SubmissionDropdown
              value={form.submissionMethod as SubmissionMethod}
              onChange={(v) => { setForm((p) => ({ ...p, submissionMethod: v })); setErrors((p) => { const n = { ...p }; delete n.submissionMethod; return n; }); }}
            />
            {errors.submissionMethod && <p style={errorStyle}>{errors.submissionMethod}</p>}
          </div>

          {form.submissionMethod === "EMAIL" && (
            <div>
              <label style={labelStyle}>Submission Email</label>
              <input placeholder="submissions@lender.com" value={form.submissionEmail} onChange={(e) => set("submissionEmail", e.target.value)} style={inputStyle()} />
            </div>
          )}

          {form.submissionMethod === "API" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>API Endpoint</label>
                <input placeholder="https://api.lender.com/submit" value={form.apiEndpoint} onChange={(e) => set("apiEndpoint", e.target.value)} style={inputStyle()} />
              </div>
              <div>
                <label style={labelStyle}>API Key</label>
                <input placeholder="Enter API key" value={form.apiKey} onChange={(e) => set("apiKey", e.target.value)} style={inputStyle()} />
              </div>
            </div>
          )}

          {form.submissionMethod === "GOOGLE_SHEET" && (
            <div>
              <label style={labelStyle}>Google Sheet ID</label>
              <input placeholder="Enter Google Sheet ID" value={form.sheetId} onChange={(e) => set("sheetId", e.target.value)} style={inputStyle()} />
            </div>
          )}
        </div>

        <ModalFooterWithDelete
          onCancel={onClose}
          onSave={() => void submit()}
          onDelete={lender?.id ? handleDelete : undefined}
          saveDisabled={saving}
          deleting={saving}
          saveLabel={lender ? "Save Changes" : "Create Lender"}
        />
      </div>
    </div>
  );
}

// ─── Create Product Modal ─────────────────────────────────────────────────────
function CreateProductModal({
  defaultLenderId,
  lenders,
  onClose,
  onCreated,
  product,
}: {
  defaultLenderId: string;
  lenders: Lender[];
  onClose: () => void;
  onCreated: () => void;
  product?: LenderProduct | null;
}) {
  useDocumentTypes();
  const queryClient = useQueryClient();
  const alwaysRequiredDoc = { key: "business_banking_statements_6_months", label: "6 months business banking statements" };
  const equipmentFinanceAlwaysRequiredDoc = {
    key: "purchase_order_or_invoice",
    label: "Purchase Order or Invoice of Equipment to finance",
    category: "EQUIPMENT_FINANCE" as const,
  };
  // BF_PORTAL_BLOCK_TWO_STAGE_v1 -- coreTypes carries a default
  // stage per doc. Removed the two aging-report duplicates (A/R
  // and A/P cover the same thing). Added "Debt stack" -- new form
  // doc (rendered as a fillable form in the client mini-portal,
  // not an upload).
  // hasForm = true means the doc renders as a digital form on the
  // client side (PNW + Debt Stack today). Other docs render as
  // upload widgets in Stage 2.
  const coreTypes = [
    { label: "3 years accountant prepared financials", defaultStage: 1 as 1 | 2 },
    { label: "3 years business tax returns", defaultStage: 1 as 1 | 2 },
    { label: "PnL – Interim financials", defaultStage: 1 as 1 | 2 },
    { label: "Balance Sheet – Interim financials", defaultStage: 1 as 1 | 2 },
    { label: "A/R", defaultStage: 1 as 1 | 2 },
    { label: "A/P", defaultStage: 1 as 1 | 2 },
    { label: "2 pieces of Government Issued ID", defaultStage: 2 as 1 | 2 },
    { label: "VOID cheque or PAD", defaultStage: 2 as 1 | 2 },
    { label: "Personal net worth statement", defaultStage: 2 as 1 | 2, hasForm: true },
    { label: "2 years personal tax returns (T1 generals)", defaultStage: 2 as 1 | 2 },
    { label: "Corporate structure / org chart", defaultStage: 2 as 1 | 2 },
    { label: "Business plan / projections", defaultStage: 2 as 1 | 2 },
    { label: "Lease agreement (if applicable)", defaultStage: 2 as 1 | 2 },
    { label: "Debt stack", defaultStage: 2 as 1 | 2, hasForm: true },
    // BF_PORTAL_BLOCK_v306_STAGE2_DOCS_v1 — new Accord stage-2 docs (CMP forms)
    { label: "Banking connection (Flinks view-only)", defaultStage: 2 as 1 | 2, hasForm: true },
    { label: "CRA view-only access", defaultStage: 2 as 1 | 2, hasForm: true },
    { label: "Real estate collateral", defaultStage: 2 as 1 | 2, hasForm: true },
    // BF_PORTAL_BLOCK_v307_EQUIPMENT_DOC_v1 — Equipment collateral now a real CMP form
    { label: "Equipment collateral", defaultStage: 2 as 1 | 2, hasForm: true },
    // BF_PORTAL_BLOCK_v706_ADVISORS_DOC_v1 — Accord Professional Advisors CMP form.
    // Explicit key so it matches the client FORM_RENDERERS key + server registry.
    { label: "Professional advisors (CPA / lawyer / insurance)", key: "professional_advisors", defaultStage: 2 as 1 | 2, hasForm: true },
  ].map((d) => ({ key: (d as any).key ?? d.label.toLowerCase().replace(/[^a-z0-9]+/g, "_"), label: d.label, defaultStage: d.defaultStage, hasForm: (d as any).hasForm ?? false }));
  const conditionalTypes = [
    "Budget",
    "Finance plan",
    "Tax credit status",
    "Production schedule",
    "Minimum guarantees / presales",
  ].map((label) => ({ key: label.toLowerCase().replace(/[^a-z0-9]+/g, "_"), label }));

  // BF_LP_FORM_INIT_v32 — null-check, NOT truthy-check. Without this, a stored
  // value of 0 (or any falsy literal) was rendering as blank.
  const [form, setForm] = useState({
    selectedLenderId: product?.lenderId ?? defaultLenderId,
    productName: (product as any)?.productName ?? (product as any)?.name ?? "",
    minAmount: product?.minAmount != null && product.minAmount > 0 ? formatDollar(product.minAmount) : "",
    maxAmount: product?.maxAmount != null && product.maxAmount > 0 ? formatDollar(product.maxAmount) : "",
    minRate: product?.interestRateMin != null && Number(product.interestRateMin) > 0 ? String(product.interestRateMin) : "",
    maxRate: product?.interestRateMax != null && Number(product.interestRateMax) > 0 ? String(product.interestRateMax) : "",
    // BF_PORTAL_BLOCK_v619_LENDERSPAGE_RATEKIND_v1
    rateKind: (((product as any)?.rateKind ?? (product as any)?.rate_kind) || "apr") as "apr" | "monthly" | "factor",
    ratePeriodDays: (((product as any)?.ratePeriodDays ?? (product as any)?.rate_period_days) != null)
      ? String((product as any)?.ratePeriodDays ?? (product as any)?.rate_period_days) : "",
    // BF_LP_FORM_FIELDS_v36 — split term into min and max, add commission and credit band.
    termMin: (product as any)?.termMin != null
      ? String((product as any).termMin)
      : (product as any)?.termLength?.min != null && (product as any)?.termLength?.min > 0
        ? String((product as any).termLength.min)
        : "",
    termMax: (product as any)?.termMax != null
      ? String((product as any).termMax)
      : (product as any)?.termLength?.max != null && (product as any)?.termLength?.max > 0
        ? String((product as any).termLength.max)
        : "",
    commission: (product as any)?.commission != null && (product as any).commission > 0
      ? String((product as any).commission)
      : "",
    creditBand: bfBandFromMin((product as any)?.minCreditScore ?? (product as any)?.minimumCreditScore ?? null),
    eligibilityNotes: product?.eligibilityRules ?? "",
    signnowTemplateId: (product as any)?.signnowTemplateId ?? "",
    // BF_PORTAL_BLOCK_v627_LENDER_PRODUCT_RATE_KIND_v1 — semi-colon-separated
    // documents-required list (matches the Excel seed shape).
    documentsRequired: (product as any)?.documentsRequired ?? (product as any)?.documents_required ?? "",
    active: product?.active ?? true,
    category: (product as any)?.category ?? "TERM_LOAN",
    // BF_PORTAL_BLOCK_v97_LENDER_PRODUCT_COUNTRY_PICKER_v1
    country: ((product as any)?.country as string | undefined) ?? "BOTH",
  });
  const [checkedDocs, setCheckedDocs] = useState<Set<string>>(() => {
    const initial = new Set<string>([alwaysRequiredDoc.key]);
    if ((product as any)?.category === "EQUIPMENT_FINANCE") {
      initial.add(equipmentFinanceAlwaysRequiredDoc.key);
    }
    if (product?.requiredDocuments?.length) {
      product.requiredDocuments.forEach((doc) => initial.add(doc.category.toLowerCase().replace(/[^a-z0-9]+/g, "_")));
    }
    return initial;
  });
  // BF_PORTAL_BLOCK_TWO_STAGE_v1 -- per-doc stage selection.
  // Initialized from the saved product if editing; otherwise from
  // each doc's defaultStage. Always-required docs are always 1.
  const [docStages, setDocStages] = useState<Map<string, 1 | 2>>(() => {
    const map = new Map<string, 1 | 2>();
    // Always-required: locked at stage 1
    map.set(alwaysRequiredDoc.key, 1);
    map.set(equipmentFinanceAlwaysRequiredDoc.key, 1);
    // Defaults from coreTypes
    for (const d of coreTypes) {
      map.set(d.key, d.defaultStage);
    }
    // Override from saved product if present
    if (product?.requiredDocuments?.length) {
      for (const doc of product.requiredDocuments) {
        const key = doc.category.toLowerCase().replace(/[^a-z0-9]+/g, "_");
        const savedStage = (doc as any).stage;
        if (savedStage === 1 || savedStage === 2) {
          map.set(key, savedStage);
        }
      }
    }
    return map;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  function set(key: string, value: string | boolean) {
    setForm((p) => ({ ...p, [key]: value }));
    setErrors((p) => { const n = { ...p }; delete n[key]; return n; });
  }

  async function handleDelete(): Promise<void> {
    if (!product?.id) return;
    setSaving(true);
    setServerError(null);
    try {
      await api.delete(`/api/portal/lender-products/${product.id}`);
      await queryClient.invalidateQueries({ queryKey: ["lender-products"] });
      onClose();
    } catch (err) {
      setServerError(getErrorMessage(err, "Delete failed."));
    } finally {
      setSaving(false);
    }
  }

  function toggleDoc(id: string) {
    if (id === alwaysRequiredDoc.key || id === equipmentFinanceAlwaysRequiredDoc.key) return;
    setCheckedDocs((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  useEffect(() => {
    setCheckedDocs((prev) => {
      const next = new Set(prev);
      if (form.category === "EQUIPMENT_FINANCE") {
        next.add(equipmentFinanceAlwaysRequiredDoc.key);
      } else {
        next.delete(equipmentFinanceAlwaysRequiredDoc.key);
      }
      return next;
    });
  }, [form.category]);

  // BF_MEDIA_FUNDING_v38 — force all conditional docs to required for Media Funding.
  useEffect(() => {
    // BF_PORTAL_BLOCK_v98_v3 — short canonical code is "MEDIA" (CATEGORY_ORDER:52)
    if (form.category !== "MEDIA") return;
    setCheckedDocs((prev) => {
      const next = new Set(prev);
      for (const d of conditionalTypes) next.add(d.key);
      return next;
    });
  }, [form.category]);

  async function submit() {
    const next: Record<string, string> = {};
    if (!form.selectedLenderId) next.selectedLenderId = "Please select a lender.";
    if (!form.productName.trim()) next.productName = "Product name is required.";
    if (!form.minAmount.trim() && !form.maxAmount.trim()) next.amount = "Amount range is required.";
    if (Object.keys(next).length) { setErrors(next); return; }

    // BF_PORTAL_BLOCK_v170_CREATE_PRODUCT_PO_DOC_LABEL_v1
    // equipmentFinanceAlwaysRequiredDoc was missing from the lookup spread,
    // so when category=EQUIPMENT_FINANCE the locked "Purchase Order or
    // Invoice of Equipment to finance" tile was in checkedDocs (added at
    // line ~466 by the initial-state setter) but `found` was undefined, and
    // the payload fell through to `id` (the snake_case "purchase_order_or_invoice"
    // key), which BF-Server's PORTAL_FORM_DOC_LABELS guard then rejected
    // with the screenshot error. Add it to the spread so the canonical
    // human-readable label flows out.
    const requiredDocuments = Array.from(checkedDocs).map((id) => {
      const found = [...coreTypes, ...conditionalTypes, alwaysRequiredDoc, equipmentFinanceAlwaysRequiredDoc].find((d) => d.key === id);
      return { category: found?.label ?? id, required: true, description: null, stage: (docStages.get(id) ?? 1) as 1 | 2 };
    });

    setSaving(true);
    setServerError(null);
    try {
      const payload = {
        lenderId: form.selectedLenderId,
        productName: form.productName.trim(),
        name: form.productName.trim(),
        category: form.category as any,
        // BF_PORTAL_BLOCK_v97_LENDER_PRODUCT_COUNTRY_PICKER_v1
        country: form.country,
        active: form.active,
        minAmount: unformatDollar(form.minAmount),
        maxAmount: unformatDollar(form.maxAmount),
        interestRateMin: form.minRate ? Number(form.minRate) : null,
        interestRateMax: form.maxRate ? Number(form.maxRate) : null,
        rateType: "fixed",
        // BF_PORTAL_BLOCK_v628_LENDER_PRODUCT_RATE_KIND_REVERT_v1 — v627
        // translated short codes to long display strings ("Monthly %",
        // "Factor (MCA)", "APR %") on submit, which the BF-Server CHECK
        // constraint (lender_products_rate_kind_check, from migration v640)
        // rejects — that constraint requires the lowercase short codes
        // ('apr','monthly','factor') exactly. Send the raw short code.
        rate_kind: form.rateKind,
        rate_min_num: form.minRate ? Number(form.minRate) : null,
        rate_max_num: form.maxRate ? Number(form.maxRate) : null,
        category_label: CATEGORY_LABELS[form.category] ?? form.category,
        documents_required: form.documentsRequired || null,
        rate_period_days: form.ratePeriodDays ? Number(form.ratePeriodDays) : null,
        // BF_LP_FORM_FIELDS_v36 — send termMin/termMax explicitly + legacy termLength.
        termMin: form.termMin ? Number(form.termMin) : null,
        termMax: form.termMax ? Number(form.termMax) : null,
        termLength: (form.termMin || form.termMax)
          ? {
              min: form.termMin ? parseInt(form.termMin) || 0 : 0,
              max: form.termMax ? parseInt(form.termMax) || 0 : 0,
              unit: "months"
            }
          : undefined,
        commission: form.commission ? Number(form.commission) : null,
        minCreditScore: bfMinFromBand(form.creditBand),
        eligibilityRules: form.eligibilityNotes || null,
        requiredDocuments,
        signnowTemplateId: form.signnowTemplateId || null,
      } as any;
      console.log("[lender-product] PATCH outgoing JSON:", JSON.stringify({ id: product?.id ?? null, body: payload })); // BF_PRODUCT_DIAG_JSON_v30
      if (product?.id) {
        const result = await updateLenderProduct(product.id, payload);
        console.log("[lender-product] PATCH result JSON:", JSON.stringify(result)); // BF_PRODUCT_DIAG_JSON_v30
      } else {
        const result = await createLenderProduct(payload);
        console.log("[lender-product] PATCH result JSON:", JSON.stringify(result)); // BF_PRODUCT_DIAG_JSON_v30
      }
      // BF_PORTAL_BLOCK_v739_LP_REFRESH — refetch lists so create/edit shows without a reload.
      await queryClient.invalidateQueries({ queryKey: ["lender-products"] });
      await queryClient.invalidateQueries({ queryKey: ["lenders"] });
      onCreated();
    } catch (err) {
      setServerError(getErrorMessage(err, "Failed to create product."));
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = (hasError?: boolean): React.CSSProperties => ({
    width: "100%", padding: "10px 14px", border: `1px solid ${hasError ? "#ef4444" : "var(--ui-border)"}`,
    borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box", color: "var(--ui-text)", background: "var(--ui-surface-strong)",
  });
  const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: "var(--ui-text)", display: "block", marginBottom: 6 };
  const errorStyle: React.CSSProperties = { fontSize: 12, color: "#ef4444", marginTop: 3 };
  const sectionStyle: React.CSSProperties = { padding: "12px 14px", background: "var(--ui-surface-muted)", borderRadius: 8, border: "1px solid var(--ui-border)" };

  // BF_PORTAL_BLOCK_TWO_STAGE_v1 -- DocCheckbox now optionally renders
  // a Stage 1 / Stage 2 toggle when the doc is in coreTypes and
  // currently checked. Always-required docs (locked=true) show a
  // "Stage 1 (locked)" badge instead. The toggle updates docStages.
  function DocCheckbox({ id, label, locked = false, showStageToggle = false, hasForm = false }: {
    id: string;
    label: string;
    locked?: boolean;
    showStageToggle?: boolean;
    hasForm?: boolean;
  }) {
    return (
      <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: locked ? "default" : "pointer", fontSize: 13, color: "var(--ui-text)", padding: "3px 0" }}>
        <input
          type="checkbox"
          checked={checkedDocs.has(id)}
          disabled={locked}
          onChange={() => toggleDoc(id)}
          style={{ width: 15, height: 15, marginTop: 1, flexShrink: 0, cursor: locked ? "default" : "pointer" }}
        />
        <span style={{ opacity: locked ? 0.6 : 1, flex: 1 }}>
          {label}
          {hasForm && (
            <span style={{ marginLeft: 6, padding: "1px 6px", fontSize: 10, fontWeight: 600, borderRadius: 3, background: "rgba(47, 168, 106, 0.12)", color: "var(--ui-accent-fg)" }}>
              📝 form
            </span>
          )}
        </span>
        {showStageToggle && checkedDocs.has(id) && !locked && (
          <div style={{ display: "flex", gap: 4, marginLeft: 8 }}>
            {[1, 2].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setDocStages((m) => new Map(m).set(id, s as 1 | 2))}
                style={{
                  padding: "2px 8px",
                  fontSize: 11,
                  fontWeight: 600,
                  borderRadius: 4,
                  border: docStages.get(id) === s ? "1px solid var(--ui-accent-blue)" : "1px solid var(--ui-border)",
                  background: docStages.get(id) === s ? "var(--ui-accent-blue)" : "var(--ui-surface-strong)",
                  color: docStages.get(id) === s ? "#fff" : "var(--ui-text-muted)",
                  cursor: "pointer",
                }}
              >
                Stage {s}
              </button>
            ))}
          </div>
        )}
        {locked && (
          <span style={{ marginLeft: 8, padding: "2px 6px", fontSize: 10, fontWeight: 600, borderRadius: 3, background: "var(--ui-surface-muted)", color: "var(--ui-text-muted)" }}>
            Stage 1 (locked)
          </span>
        )}
      </label>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.5)" }} onClick={onClose} />
      <div style={{
        position: "relative", background: "var(--ui-surface-strong)", borderRadius: 16, width: "min(680px, 95vw)",
        maxHeight: "90vh", overflowY: "auto", padding: 32, boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
      }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", fontSize: 22, color: "var(--ui-text-muted)", cursor: "pointer" }}>×</button>
        <h2 style={{ margin: "0 0 24px", fontSize: 22, fontWeight: 700, color: "var(--ui-text)" }}>{product ? "Edit Product" : "Create New Product"}</h2>

        {serverError && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#dc2626", fontSize: 13 }}>
            {serverError}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Lender selector */}
          <div>
            <label style={labelStyle}>Lender <span style={{ color: "#ef4444" }}>*</span></label>
            <select
              value={form.selectedLenderId}
              onChange={(e) => set("selectedLenderId", e.target.value)}
              style={{ ...inputStyle(!!errors.selectedLenderId), appearance: "none", backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", backgroundSize: 18 }}
            >
              <option value="">Select lender…</option>
              {lenders.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
            {errors.selectedLenderId && <p style={errorStyle}>{errors.selectedLenderId}</p>}
          </div>

          {/* PRODUCT_CORE_FIELDS_SHARED_v1 - shared with the lender self-service portal */}
          <ProductCoreFields form={form} set={set} errors={errors} showCommission />

          {/* Required Documents */}
          <div>
            <label style={{ ...labelStyle, marginBottom: 10 }}>Required Documents</label>

            {/* BF_PORTAL_BLOCK_v98_v3_ALWAYS_REQUIRED_MEDIA_GATE
                MEDIA / Film Finance products require ONLY the 5 conditional
                docs (Budget, Finance plan, Tax credit status, Production
                schedule, Minimum guarantees / presales). No bank statements,
                no photo ID. Hide the entire Always-Required block for MEDIA. */}
            {form.category !== "MEDIA" && (
              <div style={{ ...sectionStyle, marginBottom: 10 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "var(--ui-accent-fg)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px" }}>Always Required</p>
                <DocCheckbox id={alwaysRequiredDoc.key} label={alwaysRequiredDoc.label} locked />
                {form.category === equipmentFinanceAlwaysRequiredDoc.category && (
                  <DocCheckbox id={equipmentFinanceAlwaysRequiredDoc.key} label={equipmentFinanceAlwaysRequiredDoc.label} locked />
                )}
              </div>
            )}

            {/* BF_LP_MEDIA_FUNDING_GATE_v41 — Block 41-C — Core Pack hidden when
                MEDIA_FUNDING is selected. For MEDIA_FUNDING the only required
                docs are Always-Required + Conditional. For every other category
                the Core pack is shown and Conditional is hidden. */}
            {/* BF_PORTAL_BLOCK_v98_v3 — short canonical code "MEDIA" */}
            {form.category !== "MEDIA" && (
              <div style={{ ...sectionStyle, marginBottom: 10 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "var(--ui-text)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px" }}>Core Underwriting Pack</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 16px" }}>
                  {coreTypes.map((d) => (
                    <DocCheckbox
                      key={d.key}
                      id={d.key}
                      label={d.label}
                      showStageToggle
                      hasForm={(d as any).hasForm}
                    />
                  ))}
                </div>
              </div>
            )}
            {/* BF_PORTAL_BLOCK_v98_v3 — short canonical code "MEDIA" */}
            {form.category === "MEDIA" && (
              <div style={sectionStyle}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "var(--ui-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px" }}>
                  Conditional
                </p>
                {conditionalTypes.map((d) => (
                  <DocCheckbox key={d.key} id={d.key} label={d.label} />
                ))}
              </div>
            )}
          </div>

          {/* Active toggle */}
          <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
            <div
              onClick={() => set("active", !form.active)}
              style={{
                width: 44, height: 24, borderRadius: 12, position: "relative", cursor: "pointer",
                background: form.active ? "var(--ui-accent-blue)" : "var(--ui-border)", transition: "background 0.2s",
                flexShrink: 0,
              }}
            >
              <div style={{
                position: "absolute", top: 2, left: form.active ? 22 : 2, width: 20, height: 20,
                borderRadius: "50%", background: "var(--ui-surface-strong)", transition: "left 0.2s",
                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              }} />
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ui-text)" }}>Active</span>
          </label>
        </div>

        <ModalFooterWithDelete
          onCancel={onClose}
          onSave={() => void submit()}
          onDelete={product?.id ? handleDelete : undefined}
          saveDisabled={saving}
          deleting={saving}
          saveLabel={product ? "Save Changes" : "Save Product"}
        />
      </div>
    </div>
  );
}

// ─── Products panel ───────────────────────────────────────────────────────────
function ProductsPanel({
  lender,
  lenders,
  onAddProduct,
  onEditProduct,
}: {
  lender: Lender | null;
  lenders: Lender[];
  onAddProduct: () => void;
  onEditProduct: (product: LenderProduct) => void;
}) {
  // v190: flat columns — Lender name | Country | Min | Max | Active | Edit
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState<"ALL" | "US" | "CA">("ALL"); // BF_PORTAL_BLOCK_v698_LP_COUNTRY_FILTER_v1
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL"); // BF_PORTAL_BLOCK_v709_LP_CATEGORY_FILTER_v1

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["lender-products", "all"],
    queryFn: () => fetchLenderProducts(""),
    staleTime: 30_000,
  });

  const filtered = products.filter((p) => {
    const q = search.toLowerCase().trim();
    const name = ((p as any).productName || (p as any).name || "").toLowerCase();
    // BF_PORTAL_LP_SEARCH_BY_LENDER_v1 — match product name OR lender name
    const ldName = (lenders.find((x) => x.id === ((p as any).lenderId ?? (p as any).lender_id))?.name ?? "").toLowerCase();
    if (q && !name.includes(q) && !ldName.includes(q)) return false;
    // BF_PORTAL_BLOCK_v698_LP_COUNTRY_FILTER_v1 — All / US / Canada (BOTH matches either)
    if (countryFilter !== "ALL") {
      const cv = String((p as any).country ?? "").trim().toUpperCase();
      const isCA = cv === "CA" || cv === "CANADA";
      const isUS = cv === "US" || cv === "USA" || cv === "UNITED STATES";
      const isBoth = cv === "BOTH";
      if (countryFilter === "CA" && !(isCA || isBoth)) return false;
      if (countryFilter === "US" && !(isUS || isBoth)) return false;
    }
    // BF_PORTAL_BLOCK_v709_LP_CATEGORY_FILTER_v1
    if (categoryFilter !== "ALL" && ((p as any).category ?? "TERM_LOAN") !== categoryFilter) return false;
    return true;
  });

  const grouped = useMemo(() => {
    const map = new Map<string, LenderProduct[]>();
    for (const cat of CATEGORY_ORDER) map.set(cat, []);
    for (const p of filtered) {
      const cat = (p as any).category ?? "TERM_LOAN";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(p);
    }
    return Array.from(map.entries()).filter(([, items]) => items.length > 0);
  }, [filtered]);

  const isActive = !lender || (lender.active !== false &&
    (!lender.status || lender.status.toUpperCase() === "ACTIVE"));

  function toggleCollapse(cat: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  }

  function formatAmount(n: number | null | undefined) {
    if (!n) return "";
    return formatDollar(n);
  }

  function formatRateRange(min: number | string | null, max: number | string | null) {
    if (!min && !max) return "";
    if (min === max || !max) return formatRate(Number(min));
    return `${formatRate(Number(min))} – ${formatRate(Number(max))}`;
  }

  function formatTerm(p: LenderProduct) {
    const tl = (p as any).termLength;
    if (tl?.min && tl?.max) return `${tl.min}–${tl.max} months`;
    if (tl?.max) return `Up to ${tl.max} months`;
    return "";
  }

  return (
    <div style={{ flex: 1, background: "var(--ui-surface-muted)", display: "flex", flexDirection: "column", overflowY: "auto" }}>
      {/* Header — always visible */}
      <div style={{ padding: "14px 20px 12px", borderBottom: "1px solid var(--ui-border)", background: "var(--ui-surface-strong)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--ui-text)" }}>
            Lender Products{lender ? ` (selected: ${lender.name})` : ""}
          </h2>
          <button onClick={onAddProduct}
            style={{ padding: "8px 16px", background: "var(--ui-accent-blue)", border: "none", borderRadius: 8,
              fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer" }}>
            + Create Product
          </button>
        </div>
        {/* BF_PORTAL_BLOCK_v698_LP_COUNTRY_FILTER_v1 — search + country filter */}
        <div style={{ display: "flex", gap: 8 }}>
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products…"
            style={{ flex: 1, padding: "7px 12px", border: "1px solid var(--ui-border)",
              borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
          <select value={countryFilter} onChange={(e) => setCountryFilter(e.target.value as "ALL" | "US" | "CA")}
            aria-label="Filter products by country"
            style={{ padding: "7px 12px", border: "1px solid var(--ui-border)", borderRadius: 8, fontSize: 13, background: "var(--ui-surface-strong)", outline: "none", cursor: "pointer" }}>
            <option value="ALL">All countries</option>
            <option value="US">United States</option>
            <option value="CA">Canada</option>
          </select>
          {/* BF_PORTAL_BLOCK_v709_LP_CATEGORY_FILTER_v1 — category filter beside country */}
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filter products by category"
            style={{ padding: "7px 12px", border: "1px solid var(--ui-border)", borderRadius: 8, fontSize: 13, background: "var(--ui-surface-strong)", outline: "none", cursor: "pointer" }}>
            <option value="ALL">All categories</option>
            {CATEGORY_ORDER.map((c) => (
              <option key={c} value={c}>{CATEGORY_LABELS[c] ?? c}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
        {lender && !isActive && (
          <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8,
            padding: "10px 14px", display: "flex", alignItems: "center", gap: 8,
            fontSize: 13, color: "#92400e" }}>
            <span>⚠️</span>
            <span><strong>{lender.name}</strong> is inactive and cannot receive deals until reactivated.</span>
          </div>
        )}

        {isLoading && <div style={{ padding: 20, textAlign: "center", color: "var(--ui-text-muted)", fontSize: 14 }}>Loading products…</div>}

        {!isLoading && grouped.length === 0 && (
          <div style={{ padding: 32, textAlign: "center", color: "var(--ui-text-muted)", fontSize: 14 }}>
            {search ? `No products matching "${search}"` : "No products yet. Click \"+ Create Product\" to create one."}
          </div>
        )}

        {/* v190: flat product table — Lender | Country | Min | Max | Active | Edit */}
        {!isLoading && filtered.length > 0 && (
          <div style={{ background: "var(--ui-surface-strong)", borderRadius: 10, border: "1px solid var(--ui-border)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--ui-border)", background: "var(--ui-surface-muted)" }}>
                  {["Lender", "Country", "Min", "Max", "Active", ""].map((h) => (
                    <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "var(--ui-text)", fontSize: 12 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* BF_PORTAL_LP_COLLAPSIBLE_ALPHA_v1 — collapsible category groups, lenders A→Z */}
                {(() => {
                  const lenderNameOf = (p: any) => (lenders.find((x) => x.id === (p.lenderId ?? p.lender_id))?.name ?? "");
                  const byCat = new Map<string, any[]>();
                  for (const p of filtered) { const cat = (p as any).category ?? "TERM_LOAN"; if (!byCat.has(cat)) byCat.set(cat, []); byCat.get(cat)!.push(p); }
                  const ordered = CATEGORY_ORDER.filter((c) => byCat.has(c)).concat(Array.from(byCat.keys()).filter((c) => !CATEGORY_ORDER.includes(c)));
                  const rows: React.ReactNode[] = [];
                  for (const cat of ordered) {
                    const items = (byCat.get(cat) ?? []).slice().sort((a, b) => lenderNameOf(a).localeCompare(lenderNameOf(b), undefined, { sensitivity: "base" }));
                    if (!items.length) continue;
                    const isCollapsed = collapsed.has(cat);
                    rows.push(
                      <tr key={`cat-${cat}`} onClick={() => toggleCollapse(cat)} style={{ background: "var(--ui-surface-muted)", cursor: "pointer" }}>
                        <td colSpan={6} style={{ padding: "8px 12px", fontWeight: 700, color: "var(--ui-text)", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5, userSelect: "none" }}>
                          <span style={{ display: "inline-block", width: 14, color: "var(--ui-text-muted)" }}>{isCollapsed ? "▸" : "▾"}</span>
                          {CATEGORY_LABELS[cat] ?? cat} <span style={{ color: "var(--ui-text-muted)", fontWeight: 500, marginLeft: 6 }}>({items.length})</span>
                        </td>
                      </tr>
                    );
                    if (isCollapsed) continue;
                    for (const p of items) {
                      const ld = lenders.find((x) => x.id === (p.lenderId ?? p.lender_id));
                      const country = /* BF_PORTAL_BLOCK_v695_PRODUCT_COUNTRY_COLUMN_v1 */ (() => { const v = String((p as any).country ?? "").trim().toUpperCase(); if (v === "CA" || v === "CANADA") return "Canada"; if (v === "US" || v === "USA" || v === "UNITED STATES") return "United States"; if (v === "BOTH") return "Both"; return v ? String((p as any).country) : "—"; })();
                      rows.push(
                        <tr key={p.id} style={{ borderBottom: "1px solid var(--ui-border)" }}>
                          <td style={{ padding: "10px 12px", color: "var(--ui-text)", fontWeight: 500 }}>{ld?.name ?? "—"}</td>
                          <td style={{ padding: "10px 12px", color: "var(--ui-text-muted)" }}>{country}</td>
                          <td style={{ padding: "10px 12px", color: "var(--ui-text)", fontWeight: 600 }}>{formatAmount(p.minAmount) || "—"}</td>
                          <td style={{ padding: "10px 12px", color: "var(--ui-text)", fontWeight: 600 }}>{formatAmount(p.maxAmount) || "—"}</td>
                          <td style={{ padding: "10px 12px" }}>
                            <StatusBadge active={(p.is_active ?? p.active)} status={p.status} />
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "right" }}>
                            <button
                              type="button"
                              onClick={() => onEditProduct(p)}
                              style={{ padding: "5px 12px", border: "1px solid var(--ui-border)", borderRadius: 6, background: "var(--ui-surface-strong)", color: "var(--ui-accent-fg)", fontWeight: 600, cursor: "pointer" }}
                            >Edit</button>
                          </td>
                        </tr>
                      );
                    }
                  }
                  return rows;
                })()}
              </tbody>
            </table>
          </div>
        )}
        {false && grouped.map(([cat, items]) => {
          const isOpen = !collapsed.has(cat);
          return (
            <div key={cat} style={{ background: "var(--ui-surface-strong)", borderRadius: 10, border: "1px solid var(--ui-border)", overflow: "hidden" }}>
              {/* (legacy grouped render — disabled by v190; kept to avoid breaking diff anchors) */}
              <div
                onClick={() => toggleCollapse(cat)}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", cursor: "pointer", userSelect: "none" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: "var(--ui-text-muted)", fontSize: 12 }}>{isOpen ? "▼" : "▶"}</span>
                  <span style={{ fontWeight: 700, fontSize: 15, color: "var(--ui-text)" }}>{CATEGORY_LABELS[cat] ?? cat}</span>
                </div>
                <span style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>{items.length} products</span>
              </div>

              {/* Products */}
              {isOpen && items.map((p) => (
                <div
                  key={p.id}
                  style={{ display: "flex", alignItems: "center", gap: 16, padding: "10px 16px 10px 32px", borderTop: "1px solid var(--ui-border)", fontSize: 13 }}
                >
                  <span style={{ flex: 1, color: "var(--ui-text)", fontWeight: 500 }}>{(p as any).productName || (p as any).name}</span>
                  {formatAmount(p.minAmount) && (
                    <span style={{ color: "var(--ui-text)", fontWeight: 600 }}>{formatAmount(p.minAmount)}</span>
                  )}
                  {formatTerm(p) && (
                    <span style={{ color: "var(--ui-text-muted)" }}>{formatTerm(p)}</span>
                  )}
                  {formatRateRange(p.interestRateMin, p.interestRateMax) && (
                    <span style={{ color: "var(--ui-text)" }}>{formatRateRange(p.interestRateMin, p.interestRateMax)}</span>
                  )}
                  <StatusBadge active={(p as { is_active?: boolean; active?: boolean }).is_active ?? p.active} status={(p as { status?: string }).status} />
                  <button
                    type="button"
                    onClick={() => onEditProduct(p)}
                    style={{ padding: "5px 10px", border: "1px solid var(--ui-border)", borderRadius: 6, background: "var(--ui-surface-strong)", color: "var(--ui-accent-fg)", fontWeight: 600, cursor: "pointer" }}
                  >
                    Edit
                  </button>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}


function EditLenderModal({ lender, onClose, onSaved }: { lender: Lender | null; onClose: () => void; onSaved: (lender: Lender) => void }) {
  if (!lender) return null;
  return <CreateLenderModal lender={lender} onClose={onClose} onCreated={onSaved} />;
}

function EditProductModal({ product, lenders, onClose, onSaved }: { product: LenderProduct | null; lenders: Lender[]; onClose: () => void; onSaved: () => void }) {
  // BF_PRODUCT_PREFILL_v28
  const [hydrated, setHydrated] = useState<LenderProduct | null>(null);
  useEffect(() => {
    let cancelled = false;
    setHydrated(product);
    if (!product?.id) return () => { cancelled = true; };
    (async () => {
      try {
        const raw = await fetchLenderProductById(product.id);
        console.log("[lender-product] GET raw response JSON:", JSON.stringify(raw)); // BF_PRODUCT_DIAG_JSON_v30
        const source: any = (raw as any)?.product ?? (raw as any)?.data ?? raw ?? {};
        const pick = (...keys: string[]) => {
          for (const key of keys) {
            const val = source?.[key];
            if (val !== undefined && val !== null && val !== "") return val;
          }
          return undefined;
        };
        const seeded = {
          ...(product as any),
          ...(source as any),
          id: String(pick("id") ?? product.id),
          lenderId: String(pick("lenderId", "lender_id") ?? product.lenderId ?? ""),
          productName: String(pick("productName", "product_name", "name") ?? ""),
          name: String(pick("name", "productName", "product_name") ?? ""),
          category: String(pick("category", "category_name", "categoryName") ?? "TERM_LOAN"),
          minAmount: Number(pick("minAmount", "amount_min", "min_amount", "amountMin") ?? 0) || 0,
          maxAmount: Number(pick("maxAmount", "amount_max", "max_amount", "amountMax") ?? 0) || 0,
          interestRateMin: Number(pick("interestRateMin", "rate_min", "min_rate", "rateMin") ?? 0) || 0,
          interestRateMax: Number(pick("interestRateMax", "rate_max", "max_rate", "rateMax") ?? 0) || 0,
          eligibilityRules: String(pick("eligibilityRules", "eligibility_notes", "eligibilityNotes", "notes") ?? ""),
          signnowTemplateId: pick("signnowTemplateId", "signnow_template_id", "signnowTemplateID") ?? null,
          requiredDocuments: pick("requiredDocuments", "required_documents", "documents", "docs") ?? [],
          // BF_PORTAL_BLOCK_v627_LENDER_PRODUCT_RATE_KIND_v1 — hydrate new fields
          rateKind: ((): "apr" | "monthly" | "factor" => {
            const k = pick("rateKind", "rate_kind");
            if (k === "Monthly %" || k === "monthly") return "monthly";
            if (k === "Factor (MCA)" || k === "factor") return "factor";
            return "apr";
          })(),
          documentsRequired: String(pick("documentsRequired", "documents_required") ?? ""),
          categoryLabel: pick("categoryLabel", "category_label") ?? null,
          active: Boolean(pick("active", "is_active", "isActive") ?? true),
          termLength: source?.termLength ?? source?.term_length ?? product.termLength,
        } as LenderProduct;
        if (!cancelled) {
          console.log("[lender-product] seeded form values JSON:", JSON.stringify(seeded)); // BF_PRODUCT_DIAG_JSON_v30
          setHydrated(seeded);
        }
      } catch (error) {
        console.error("[lender-product.prefill] failed", { id: product.id, error });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [product]);

  if (!product) return null;
  return <CreateProductModal product={hydrated ?? product} defaultLenderId={product.lenderId} lenders={lenders} onClose={onClose} onCreated={onSaved} />;
}

// ─── Main page ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 10;

export default function LendersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Lender | null>(null);
  const [showCreateLender, setShowCreateLender] = useState(false);
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [editingLender, setEditingLender] = useState<Lender | null>(null);
  const [editingProduct, setEditingProduct] = useState<LenderProduct | null>(null);
  // LENDER_PRODUCT_NOTIF_DEEPLINK_v1 - staff notifications link to /lenders?editProduct=<id>.
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const pid = searchParams.get("editProduct");
    if (!pid) return;
    setEditingProduct({ id: pid } as LenderProduct);
    const next = new URLSearchParams(searchParams);
    next.delete("editProduct");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);
  const [sortKey, setSortKey] = useState<"name" | "status" | "active" | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc" | null>(null);

  const { data: lenders = [], isLoading } = useQuery({
    queryKey: ["lenders"],
    queryFn: fetchLenders,
    staleTime: 30_000,
  });

  // BF_PORTAL_BLOCK_v709_LP_PRODUCT_COUNTS_v1 — per-lender product counts.
  // Reuses the ["lender-products","all"] query cache (no extra fetch).
  const { data: lpForCounts = [] } = useQuery({
    queryKey: ["lender-products", "all"],
    queryFn: () => fetchLenderProducts(""),
    staleTime: 30_000,
  });
  const productCountByLender = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of lpForCounts) {
      const lid = String((p as any).lenderId ?? (p as any).lender_id ?? "");
      if (lid) m.set(lid, (m.get(lid) ?? 0) + 1);
    }
    return m;
  }, [lpForCounts]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return lenders.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.primaryContact?.name?.toLowerCase().includes(q)
    );
  }, [lenders, search]);

  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return filtered;
    const copy = [...filtered];
    copy.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortKey === "active") return ((a.active ? 1 : 0) - (b.active ? 1 : 0)) * dir;
      const av = sortKey === "status" ? (a.status ?? "") : (a.name ?? "");
      const bv = sortKey === "status" ? (b.status ?? "") : (b.name ?? "");
      return av.toLowerCase().localeCompare(bv.toLowerCase()) * dir;
    });
    return copy;
  }, [filtered, sortDir, sortKey]);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const cycleSort = (key: "name" | "status" | "active") => {
    if (sortKey !== key) { setSortKey(key); setSortDir("asc"); return; }
    if (sortDir === "asc") setSortDir("desc");
    else if (sortDir === "desc") { setSortDir(null); setSortKey(null); }
    else setSortDir("asc");
  };

  const handleLenderCreated = useCallback(
    (lender: Lender) => {
      void queryClient.invalidateQueries({ queryKey: ["lenders"] });
      setShowCreateLender(false);
      setSelected(lender);
    },
    [queryClient]
  );

  const handleProductCreated = useCallback(() => {
    if (selected) {
      void queryClient.invalidateQueries({ queryKey: ["lender-products"] });
    }
    setShowCreateProduct(false);
  }, [queryClient, selected]);

  return (
    <div style={{ display: "flex", height: "calc(100vh - 80px)", overflow: "hidden" }}>
      {/* ── Left panel — lender list ── */}
      <div style={{ width: 440, minWidth: 340, borderRight: "1px solid var(--ui-border)", display: "flex", flexDirection: "column", background: "var(--ui-surface-strong)" }}>
        {/* Header */}
        <div style={{ padding: "20px 20px 14px" }}>
          <h1 style={{ margin: "0 0 14px", fontSize: 22, fontWeight: 700, color: "var(--ui-text)" }}>Lenders</h1>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1, position: "relative" }}>
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--ui-text-muted)", fontSize: 14 }}>🔍</span>
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search lenders..."
                style={{ width: "100%", padding: "8px 12px 8px 32px", border: "1px solid var(--ui-border)", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box", color: "var(--ui-text)" }}
              />
            </div>
            <button
              onClick={() => setShowCreateLender(true)}
              style={{ padding: "8px 16px", background: "var(--ui-accent-blue)", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer", whiteSpace: "nowrap" }}
            >
              Create lender
            </button>
          </div>
        </div>

        {/* Table */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--ui-border)" }}>
                {/* BF_PORTAL_BLOCK_v709_LP_PRODUCT_COUNTS_v1 — Products column between Name and Status */}
                <th onClick={() => cycleSort("name")} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "var(--ui-text-muted)", fontSize: 12, background: "var(--ui-surface-muted)", cursor: "pointer" }}>Lender Name{sortKey === "name" ? (sortDir === "asc" ? " ▲" : sortDir === "desc" ? " ▼" : "") : ""}</th>
                <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "var(--ui-text-muted)", fontSize: 12, background: "var(--ui-surface-muted)" }}>Products</th>
                {[
                  ["Status", "status"],
                ].map(([h, key]) => (
                  <th key={h} onClick={() => cycleSort(key as "name" | "status" | "active")} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "var(--ui-text-muted)", fontSize: 12, background: "var(--ui-surface-muted)", cursor: "pointer" }}>{h}{sortKey === key ? (sortDir === "asc" ? " ▲" : sortDir === "desc" ? " ▼" : "") : ""}</th>
                ))}
                <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "var(--ui-text-muted)", fontSize: 12, background: "var(--ui-surface-muted)" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={4} style={{ padding: 24, textAlign: "center", color: "var(--ui-text-muted)" }}>Loading…</td></tr>
              )}
              {!isLoading && paginated.length === 0 && (
                <tr><td colSpan={4} style={{ padding: 24, textAlign: "center", color: "var(--ui-text-muted)" }}>No lenders found</td></tr>
              )}
              {paginated.map((l) => {
                const isSelected = selected?.id === l.id;
                return (
                  <tr
                    key={l.id}
                    onClick={() => setSelected(l)}
                    style={{
                      cursor: "pointer",
                      background: isSelected ? "rgba(47, 168, 106, 0.12)" : "transparent",
                      borderLeft: isSelected ? "3px solid var(--ui-accent-blue)" : "3px solid transparent",
                      borderBottom: "1px solid var(--ui-border)",
                      transition: "background 0.1s",
                    }}
                  >
                    <td style={{ padding: "10px 12px", fontWeight: isSelected ? 600 : 400, color: "var(--ui-text)" }}>{l.name}</td>
                    {/* BF_PORTAL_BLOCK_v709_LP_PRODUCT_COUNTS_v1 */}
                    <td style={{ padding: "10px 12px", color: "var(--ui-text-muted)", fontWeight: 600 }}>{productCountByLender.get(l.id) ?? 0}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <StatusBadge active={l.active} status={l.status} />
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setEditingLender(l);
                        }}
                        style={{ padding: "5px 10px", border: "1px solid var(--ui-border)", borderRadius: 6, background: "var(--ui-surface-strong)", color: "var(--ui-accent-fg)", fontWeight: 600, cursor: "pointer" }}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ padding: "10px 16px", borderTop: "1px solid var(--ui-border)", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, color: "var(--ui-text-muted)" }}>
          <span>{filtered.length === 0 ? "0" : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)}`} of {filtered.length}</span>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button onClick={() => setPage(1)} disabled={page === 1} style={{ padding: "3px 7px", border: "1px solid var(--ui-border)", borderRadius: 5, cursor: page === 1 ? "default" : "pointer", background: "var(--ui-surface-strong)", opacity: page === 1 ? 0.4 : 1 }}>«</button>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: "3px 7px", border: "1px solid var(--ui-border)", borderRadius: 5, cursor: page === 1 ? "default" : "pointer", background: "var(--ui-surface-strong)", opacity: page === 1 ? 0.4 : 1 }}>‹</button>
            <span style={{ padding: "3px 10px", background: "var(--ui-surface-muted)", borderRadius: 5, fontWeight: 600 }}>{page}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: "3px 7px", border: "1px solid var(--ui-border)", borderRadius: 5, cursor: page === totalPages ? "default" : "pointer", background: "var(--ui-surface-strong)", opacity: page === totalPages ? 0.4 : 1 }}>›</button>
            <button onClick={() => setPage(totalPages)} disabled={page === totalPages} style={{ padding: "3px 7px", border: "1px solid var(--ui-border)", borderRadius: 5, cursor: page === totalPages ? "default" : "pointer", background: "var(--ui-surface-strong)", opacity: page === totalPages ? 0.4 : 1 }}>»</button>
          </div>
        </div>
      </div>

      {/* ── Right panel — always visible ── */}
      <ProductsPanel
        lender={selected}
        lenders={lenders}
        onAddProduct={() => setShowCreateProduct(true)}
        onEditProduct={(product) => setEditingProduct(product)}
      />

      {/* Modals */}
      {showCreateLender && (
        <CreateLenderModal
          onClose={() => setShowCreateLender(false)}
          onCreated={handleLenderCreated}
        />
      )}
      {editingLender && (
        <EditLenderModal
          lender={editingLender}
          onClose={() => setEditingLender(null)}
          onSaved={(lender) => {
            setEditingLender(null);
            handleLenderCreated(lender);
          }}
        />
      )}
      {showCreateProduct && (
        <CreateProductModal
          defaultLenderId={selected?.id ?? ""}
          lenders={lenders}
          onClose={() => setShowCreateProduct(false)}
          onCreated={handleProductCreated}
        />
      )}
      {editingProduct && (
        <EditProductModal
          product={editingProduct}
          lenders={lenders}
          onClose={() => setEditingProduct(null)}
          onSaved={() => {
            setEditingProduct(null);
            handleProductCreated();
          }}
        />
      )}
    </div>
  );
}
