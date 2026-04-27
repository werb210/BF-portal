import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

// BF_LP_FORM_FIELDS_v36 — Block 36 — credit score bands shared between
// lender product min and applicant Step 4 dropdown.
const CREDIT_SCORE_BANDS = [
  { label: "Under 560", lower: 0 },
  { label: "561 to 600", lower: 561 },
  { label: "600 to 660", lower: 600 },
  { label: "661 to 720", lower: 661 },
  { label: "Over 720", lower: 720 },
] as const;

function bfBandFromMin(min: number | null | undefined): string {
  if (min == null) return "";
  const exact = CREDIT_SCORE_BANDS.find((b) => b.lower === min);
  if (exact) return exact.label;
  const below = [...CREDIT_SCORE_BANDS].reverse().find((b) => b.lower <= min);
  return below?.label ?? "";
}

function bfMinFromBand(label: string): number | null {
  const found = CREDIT_SCORE_BANDS.find((b) => b.label === label);
  return found ? found.lower : null;
}

// ─── Types ────────────────────────────────────────────────────────────────────
type SubmissionMethod = "EMAIL" | "API" | "GOOGLE_SHEET";

const SUBMISSION_LABELS: Record<SubmissionMethod, string> = {
  EMAIL: "Email",
  API: "API",
  GOOGLE_SHEET: "Google Sheet (Merchant Growth)",
};

const CATEGORY_ORDER = ["TERM_LOAN", "LINE_OF_CREDIT", "FACTORING", "EQUIPMENT_FINANCE", "PURCHASE_ORDER_FINANCE", "MERCHANT_CASH_ADVANCE", "MEDIA_FUNDING", "ASSET_BASED_LENDING", "SBA_GOVERNMENT", "STARTUP_CAPITAL"];

const CATEGORY_LABELS: Record<string, string> = {
  TERM_LOAN: "Term Loans",
  LINE_OF_CREDIT: "Line of Credit",
  FACTORING: "Factoring",
  EQUIPMENT_FINANCE: "Equipment Finance",
  PURCHASE_ORDER_FINANCE: "Purchase Order Finance",
  MERCHANT_CASH_ADVANCE: "Merchant Cash Advance",
  MEDIA_FUNDING: "Media Funding",
  ASSET_BASED_LENDING: "Asset Based Lending",
  SBA_GOVERNMENT: "SBA / Government",
  STARTUP_CAPITAL: "Startup Capital",
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
        background: isActive ? "#22c55e22" : isInactive ? "#e2e8f0" : "#e2e8f0",
        color: isActive ? "#16a34a" : isInactive ? "#475569" : "#475569",
        border: `1px solid ${isActive ? "#22c55e44" : "#cbd5e1"}`,
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
          width: "100%", padding: "10px 14px", border: "1px solid #d1d5db",
          borderRadius: 8, background: "#fff", textAlign: "left", fontSize: 14,
          color: value ? "#111827" : "#9ca3af",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          cursor: "pointer",
        }}
      >
        <span>{value ? SUBMISSION_LABELS[value] : "Select method..."}</span>
        <span style={{ color: "#6b7280" }}>▾</span>
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
          background: "#fff", border: "1px solid #d1d5db", borderRadius: 8,
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)", zIndex: 100, padding: "8px 0",
        }}>
          {(["EMAIL", "API", "GOOGLE_SHEET"] as SubmissionMethod[]).map((method) => (
            <label
              key={method}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 14px", cursor: "pointer", fontSize: 14,
                color: "#111827",
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
    street: lender?.address?.street ?? "",
    cityStateZip: "",
    phone: lender?.phone ?? "",
    contactName: lender?.primaryContact?.name ?? "",
    contactPhone: lender?.primaryContact?.phone ?? "",
    contactEmail: lender?.primaryContact?.email ?? "",
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
      setServerError(getErrorMessage(err, "Delete failed."));
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
        country: "CA",
        street: form.street.trim() || null,
        city: null,
        region: null,
        postalCode: null,
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
    width: "100%", padding: "10px 14px", border: `1px solid ${hasError ? "#ef4444" : "#d1d5db"}`,
    borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box", color: "#111827",
    background: "#fff",
  });

  const labelStyle: React.CSSProperties = {
    fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6,
  };

  const errorStyle: React.CSSProperties = { fontSize: 12, color: "#ef4444", marginTop: 3 };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.5)" }} onClick={onClose} />
      <div style={{
        position: "relative", background: "#fff", borderRadius: 16, width: "min(680px, 95vw)",
        maxHeight: "90vh", overflowY: "auto", padding: 32, boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
      }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", fontSize: 22, color: "#6b7280", cursor: "pointer" }}>×</button>
        <h2 style={{ margin: "0 0 24px", fontSize: 22, fontWeight: 700, color: "#111827" }}>{lender ? "Edit Lender" : "Create New Lender"}</h2>

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

          {/* Lender Address */}
          <div>
            <label style={labelStyle}>Lender Address <span style={{ color: "#ef4444" }}>*</span></label>
            <input placeholder="Enter street address" value={form.street} onChange={(e) => set("street", e.target.value)}
              style={{ ...inputStyle(), marginBottom: 8 }} />
            <input placeholder="City, State / Province, ZIP / Postal Code" value={form.cityStateZip}
              onChange={(e) => set("cityStateZip", e.target.value)} style={inputStyle()} />
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
            <p style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: "4px 0 12px" }}>Primary Contact</p>
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
  const coreTypes = [
    "3 years accountant prepared financials",
    "3 years business tax returns",
    "PnL – Interim financials",
    "Balance Sheet – Interim financials",
    "A/R",
    "A/P",
    "2 pieces of Government Issued ID",
    "VOID cheque or PAD",
    "Personal net worth statement",
    "2 years personal tax returns (T1 generals)",
    "Corporate structure / org chart",
    "Business plan / projections",
    "Lease agreement (if applicable)",
    "Accounts receivable aging report",
    "Accounts payable aging report",
  ].map((label) => ({ key: label.toLowerCase().replace(/[^a-z0-9]+/g, "_"), label }));
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
    active: product?.active ?? true,
    category: (product as any)?.category ?? "TERM_LOAN",
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
    if (form.category !== "MEDIA_FUNDING") return;
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

    const requiredDocuments = Array.from(checkedDocs).map((id) => {
      const found = [...coreTypes, ...conditionalTypes, alwaysRequiredDoc].find((d) => d.key === id);
      return { category: found?.label ?? id, required: true, description: null };
    });

    setSaving(true);
    setServerError(null);
    try {
      const payload = {
        lenderId: form.selectedLenderId,
        productName: form.productName.trim(),
        name: form.productName.trim(),
        category: form.category as any,
        country: "CA",
        active: form.active,
        minAmount: unformatDollar(form.minAmount),
        maxAmount: unformatDollar(form.maxAmount),
        interestRateMin: form.minRate ? Number(form.minRate) : null,
        interestRateMax: form.maxRate ? Number(form.maxRate) : null,
        rateType: "fixed",
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
      onCreated();
    } catch (err) {
      setServerError(getErrorMessage(err, "Failed to create product."));
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = (hasError?: boolean): React.CSSProperties => ({
    width: "100%", padding: "10px 14px", border: `1px solid ${hasError ? "#ef4444" : "#d1d5db"}`,
    borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box", color: "#111827", background: "#fff",
  });
  const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 };
  const errorStyle: React.CSSProperties = { fontSize: 12, color: "#ef4444", marginTop: 3 };
  const sectionStyle: React.CSSProperties = { padding: "12px 14px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" };

  function DocCheckbox({ id, label, locked }: { id: string; label: string; locked?: boolean }) {
    return (
      <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: locked ? "default" : "pointer", fontSize: 13, color: "#374151", padding: "3px 0" }}>
        <input
          type="checkbox"
          checked={checkedDocs.has(id)}
          disabled={locked}
          onChange={() => toggleDoc(id)}
          style={{ width: 15, height: 15, marginTop: 1, flexShrink: 0, cursor: locked ? "default" : "pointer" }}
        />
        <span style={{ opacity: locked ? 0.6 : 1 }}>{label}{locked && <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: 4 }}>(always required)</span>}</span>
      </label>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.5)" }} onClick={onClose} />
      <div style={{
        position: "relative", background: "#fff", borderRadius: 16, width: "min(680px, 95vw)",
        maxHeight: "90vh", overflowY: "auto", padding: 32, boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
      }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", fontSize: 22, color: "#6b7280", cursor: "pointer" }}>×</button>
        <h2 style={{ margin: "0 0 24px", fontSize: 22, fontWeight: 700, color: "#111827" }}>{product ? "Edit Product" : "Create New Product"}</h2>

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

          {/* Product Name */}
          <div>
            <label style={labelStyle}>Product Name <span style={{ color: "#ef4444" }}>*</span></label>
            <input placeholder="Enter product name" value={form.productName} onChange={(e) => set("productName", e.target.value)}
              style={inputStyle(!!errors.productName)} />
            {errors.productName && <p style={errorStyle}>{errors.productName}</p>}
          </div>

          {/* Category */}
          <div>
            <label style={labelStyle}>Category <span style={{ color: "#ef4444" }}>*</span></label>
            <select value={form.category} onChange={(e) => set("category", e.target.value)}
              style={{ ...inputStyle(), appearance: "none", backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", backgroundSize: 18 }}>
              {CATEGORY_ORDER.map((c) => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </div>

          {/* Amount Range */}
          <div>
            <label style={labelStyle}>Amount Range <span style={{ color: "#ef4444" }}>*</span></label>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <input placeholder="Minimum amount" value={form.minAmount} onChange={(e) => set("minAmount", formatDollar(e.target.value))}
                style={{ ...inputStyle(!!errors.amount), flex: 1 }} />
              <span style={{ color: "#9ca3af", fontSize: 18, flexShrink: 0 }}>—</span>
              <input placeholder="Maximum amount" value={form.maxAmount} onChange={(e) => set("maxAmount", formatDollar(e.target.value))}
                style={{ ...inputStyle(), flex: 1 }} />
            </div>
            {errors.amount && <p style={errorStyle}>{errors.amount}</p>}
          </div>

          {/* Rate / Fee Range */}
          <div>
            <label style={labelStyle}>Rate / Fee Range <span style={{ color: "#ef4444" }}>*</span></label>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <input placeholder="e.g. 4.99" value={form.minRate} onChange={(e) => set("minRate", e.target.value)}
                style={{ ...inputStyle(), flex: 1 }} type="text" inputMode="decimal" />
              <span style={{ color: "#9ca3af", fontSize: 18, flexShrink: 0 }}>—</span>
              <input placeholder="e.g. 19.99" value={form.maxRate} onChange={(e) => set("maxRate", e.target.value)}
                style={{ ...inputStyle(), flex: 1 }} type="text" inputMode="decimal" />
            </div>
          </div>

          {/* BF_LP_FORM_FIELDS_v36 — Term Min + Max, Commission, Min Credit Score */}
          <div>
            <label style={labelStyle}>Term <span style={{ color: "#9ca3af", fontWeight: 400 }}>(months)</span></label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 8, alignItems: "center" }}>
              <input
                placeholder="e.g. 6"
                inputMode="numeric"
                value={form.termMin}
                onChange={(e) => set("termMin", e.target.value.replace(/[^0-9]/g, ""))}
                style={inputStyle()}
              />
              <span style={{ color: "#6b7280" }}>—</span>
              <input
                placeholder="e.g. 24"
                inputMode="numeric"
                value={form.termMax}
                onChange={(e) => set("termMax", e.target.value.replace(/[^0-9]/g, ""))}
                style={inputStyle()}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Commission <span style={{ color: "#9ca3af", fontWeight: 400 }}>(%, internal)</span></label>
            <input
              placeholder="e.g. 1.5"
              inputMode="decimal"
              value={form.commission}
              onChange={(e) => set("commission", e.target.value.replace(/[^0-9.]/g, ""))}
              style={inputStyle()}
            />
          </div>

          <div>
            <label style={labelStyle}>Minimum Credit Score</label>
            <select
              value={form.creditBand}
              onChange={(e) => set("creditBand", e.target.value)}
              style={inputStyle()}
            >
              <option value="">No minimum</option>
              {CREDIT_SCORE_BANDS.map((b) => (
                <option key={b.label} value={b.label}>{b.label}</option>
              ))}
            </select>
          </div>

          {/* Eligibility Notes */}
          <div>
            <label style={labelStyle}>Eligibility Notes <span style={{ color: "#6b7280", fontWeight: 400 }}>(Optional)</span></label>
            <textarea placeholder="Enter any eligibility requirements" value={form.eligibilityNotes}
              onChange={(e) => set("eligibilityNotes", e.target.value)} rows={3}
              style={{ ...inputStyle(), resize: "vertical" }} />
          </div>

          {/* SignNow Template ID */}
          <div>
            <label style={labelStyle}>SignNow Template ID <span style={{ color: "#6b7280", fontWeight: 400 }}>(Optional)</span></label>
            <input placeholder="Enter SignNow template ID" value={form.signnowTemplateId}
              onChange={(e) => set("signnowTemplateId", e.target.value)} style={inputStyle()} />
          </div>

          {/* Required Documents */}
          <div>
            <label style={{ ...labelStyle, marginBottom: 10 }}>Required Documents</label>

            <div style={{ ...sectionStyle, marginBottom: 10 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px" }}>Always Required</p>
              <DocCheckbox id={alwaysRequiredDoc.key} label={alwaysRequiredDoc.label} locked />
              {form.category === equipmentFinanceAlwaysRequiredDoc.category && (
                <DocCheckbox id={equipmentFinanceAlwaysRequiredDoc.key} label={equipmentFinanceAlwaysRequiredDoc.label} locked />
              )}
            </div>

            <div style={{ ...sectionStyle, marginBottom: 10 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px" }}>Core Underwriting Pack</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 16px" }}>
                {coreTypes.map((d) => (
                  <DocCheckbox key={d.key} id={d.key} label={d.label} />
                ))}
              </div>
            </div>
            {form.category !== "MEDIA_FUNDING" && (
              <div style={sectionStyle}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px" }}>
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
                background: form.active ? "#2563eb" : "#d1d5db", transition: "background 0.2s",
                flexShrink: 0,
              }}
            >
              <div style={{
                position: "absolute", top: 2, left: form.active ? 22 : 2, width: 20, height: 20,
                borderRadius: "50%", background: "#fff", transition: "left 0.2s",
                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              }} />
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#374151" }}>Active</span>
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
  onAddProduct,
  onEditProduct,
}: {
  lender: Lender | null;
  onAddProduct: () => void;
  onEditProduct: (product: LenderProduct) => void;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["lender-products", "all"],
    queryFn: () => fetchLenderProducts(""),
    staleTime: 30_000,
  });

  const filtered = products.filter((p) => {
    const q = search.toLowerCase();
    const name = ((p as any).productName || (p as any).name || "").toLowerCase();
    return name.includes(q);
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
    <div style={{ flex: 1, background: "#f8fafc", display: "flex", flexDirection: "column", overflowY: "auto" }}>
      {/* Header — always visible */}
      <div style={{ padding: "14px 20px 12px", borderBottom: "1px solid #e2e8f0", background: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
            Lender Products{lender ? ` (selected: ${lender.name})` : ""}
          </h2>
          <button onClick={onAddProduct}
            style={{ padding: "8px 16px", background: "#2563eb", border: "none", borderRadius: 8,
              fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer" }}>
            + Create Product
          </button>
        </div>
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products…"
          style={{ width: "100%", padding: "7px 12px", border: "1px solid #d1d5db",
            borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
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

        {isLoading && <div style={{ padding: 20, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>Loading products…</div>}

        {!isLoading && grouped.length === 0 && (
          <div style={{ padding: 32, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
            {search ? `No products matching "${search}"` : "No products yet. Click \"+ Create Product\" to create one."}
          </div>
        )}

        {grouped.map(([cat, items]) => {
          const isOpen = !collapsed.has(cat);
          return (
            <div key={cat} style={{ background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", overflow: "hidden" }}>
              {/* Category header */}
              <div
                onClick={() => toggleCollapse(cat)}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", cursor: "pointer", userSelect: "none" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: "#6b7280", fontSize: 12 }}>{isOpen ? "▼" : "▶"}</span>
                  <span style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>{CATEGORY_LABELS[cat] ?? cat}</span>
                </div>
                <span style={{ fontSize: 12, color: "#94a3b8" }}>{items.length} products</span>
              </div>

              {/* Products */}
              {isOpen && items.map((p) => (
                <div
                  key={p.id}
                  style={{ display: "flex", alignItems: "center", gap: 16, padding: "10px 16px 10px 32px", borderTop: "1px solid #f1f5f9", fontSize: 13 }}
                >
                  <span style={{ flex: 1, color: "#1e293b", fontWeight: 500 }}>{(p as any).productName || (p as any).name}</span>
                  {formatAmount(p.minAmount) && (
                    <span style={{ color: "#374151", fontWeight: 600 }}>{formatAmount(p.minAmount)}</span>
                  )}
                  {formatTerm(p) && (
                    <span style={{ color: "#64748b" }}>{formatTerm(p)}</span>
                  )}
                  {formatRateRange(p.interestRateMin, p.interestRateMax) && (
                    <span style={{ color: "#374151" }}>{formatRateRange(p.interestRateMin, p.interestRateMax)}</span>
                  )}
                  <StatusBadge active={(p as { is_active?: boolean; active?: boolean }).is_active ?? p.active} status={(p as { status?: string }).status} />
                  <button
                    type="button"
                    onClick={() => onEditProduct(p)}
                    style={{ padding: "5px 10px", border: "1px solid #cbd5e1", borderRadius: 6, background: "#fff", color: "#1d4ed8", fontWeight: 600, cursor: "pointer" }}
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

  const { data: lenders = [], isLoading } = useQuery({
    queryKey: ["lenders"],
    queryFn: fetchLenders,
    staleTime: 30_000,
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return lenders.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.address?.country?.toLowerCase().includes(q) ||
        l.primaryContact?.name?.toLowerCase().includes(q)
    );
  }, [lenders, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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
      <div style={{ width: 440, minWidth: 340, borderRight: "1px solid #e2e8f0", display: "flex", flexDirection: "column", background: "#fff" }}>
        {/* Header */}
        <div style={{ padding: "20px 20px 14px" }}>
          <h1 style={{ margin: "0 0 14px", fontSize: 22, fontWeight: 700, color: "#0f172a" }}>Lenders</h1>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1, position: "relative" }}>
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", fontSize: 14 }}>🔍</span>
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search lenders..."
                style={{ width: "100%", padding: "8px 12px 8px 32px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box", color: "#111827" }}
              />
            </div>
            <button
              onClick={() => setShowCreateLender(true)}
              style={{ padding: "8px 16px", background: "#2563eb", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer", whiteSpace: "nowrap" }}
            >
              Create lender
            </button>
          </div>
        </div>

        {/* Table */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #f1f5f9" }}>
                {["Lender", "Status", "Country", "Primary Contact", "Actions"].map((h) => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#64748b", fontSize: 12, background: "#f8fafc" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={5} style={{ padding: 24, textAlign: "center", color: "#94a3b8" }}>Loading…</td></tr>
              )}
              {!isLoading && paginated.length === 0 && (
                <tr><td colSpan={5} style={{ padding: 24, textAlign: "center", color: "#94a3b8" }}>No lenders found</td></tr>
              )}
              {paginated.map((l) => {
                const isSelected = selected?.id === l.id;
                return (
                  <tr
                    key={l.id}
                    onClick={() => setSelected(l)}
                    style={{
                      cursor: "pointer",
                      background: isSelected ? "#eff6ff" : "transparent",
                      borderLeft: isSelected ? "3px solid #2563eb" : "3px solid transparent",
                      borderBottom: "1px solid #f1f5f9",
                      transition: "background 0.1s",
                    }}
                  >
                    <td style={{ padding: "10px 12px", fontWeight: isSelected ? 600 : 400, color: "#1e293b" }}>{l.name}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <StatusBadge active={l.active} status={l.status} />
                    </td>
                    <td style={{ padding: "10px 12px", color: "#64748b" }}>
                      {l.address?.country === "CA" ? "Canada" : l.address?.country === "US" ? "USA" : l.address?.country ?? "—"}
                    </td>
                    <td style={{ padding: "10px 12px", color: "#64748b" }}>{l.primaryContact?.name ?? "—"}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setEditingLender(l);
                        }}
                        style={{ padding: "5px 10px", border: "1px solid #cbd5e1", borderRadius: 6, background: "#fff", color: "#1d4ed8", fontWeight: 600, cursor: "pointer" }}
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
        <div style={{ padding: "10px 16px", borderTop: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, color: "#64748b" }}>
          <span>{filtered.length === 0 ? "0" : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)}`} of {filtered.length}</span>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button onClick={() => setPage(1)} disabled={page === 1} style={{ padding: "3px 7px", border: "1px solid #e2e8f0", borderRadius: 5, cursor: page === 1 ? "default" : "pointer", background: "#fff", opacity: page === 1 ? 0.4 : 1 }}>«</button>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: "3px 7px", border: "1px solid #e2e8f0", borderRadius: 5, cursor: page === 1 ? "default" : "pointer", background: "#fff", opacity: page === 1 ? 0.4 : 1 }}>‹</button>
            <span style={{ padding: "3px 10px", background: "#f1f5f9", borderRadius: 5, fontWeight: 600 }}>{page}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: "3px 7px", border: "1px solid #e2e8f0", borderRadius: 5, cursor: page === totalPages ? "default" : "pointer", background: "#fff", opacity: page === totalPages ? 0.4 : 1 }}>›</button>
            <button onClick={() => setPage(totalPages)} disabled={page === totalPages} style={{ padding: "3px 7px", border: "1px solid #e2e8f0", borderRadius: 5, cursor: page === totalPages ? "default" : "pointer", background: "#fff", opacity: page === totalPages ? 0.4 : 1 }}>»</button>
          </div>
        </div>
      </div>

      {/* ── Right panel — always visible ── */}
      <ProductsPanel
        lender={selected}
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
