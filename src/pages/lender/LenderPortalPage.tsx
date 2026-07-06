// LENDER_PORTAL_ONE_PAGE_v1 / v2 layout - the entire lender self-service portal
// on ONE page. Left column: company information displayed read-only with an
// Edit button that opens the lender form as a modal (company name stays
// read-only; staff-only fields like submission method / API keys are never
// shown). Right column: the lender's products listed like the staff Lender
// Products list (Category / Country / Min / Max / Active / Edit), where Edit
// opens the same Edit Product form (shared ProductCoreFields). Uploads section
// below (product sheets + marketing -> lender_documents -> Maya training).
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api";
import logoWhite from "@/assets/logo-boreal-mountains-white.svg"; // BF_PORTAL_LENDER_HEADER_v1
import { formatDollar, unformatDollar } from "@/utils/format";
import { Field, inputStyle } from "@/pages/lenders/components/lenderFieldShared";
import {
  ProductCoreFields,
  type ProductCoreForm,
  CATEGORY_LONG_TO_SHORT,
  CATEGORY_SHORT_TO_LONG,
  CATEGORY_LABELS,
  bfBandFromMin,
  bfMinFromBand,
} from "@/pages/lenders/productFormShared";

type Profile = {
  name?: string; phone?: string; website?: string; description?: string;
  contact_name?: string; contact_email?: string; contact_phone?: string;
  street?: string; city?: string; region?: string; postal_code?: string; country?: string;
  // LENDER_COMPANY_PARITY_v1 - staff-form fields (commission-free parity)
  application_url?: string; announcement?: string; submission_method?: string; submission_email?: string;
};

type Product = {
  id: string; name: string;
  category: string; type?: string; country: string; active: boolean;
  amount_min?: number | null; amount_max?: number | null;
  interest_min?: string | null; interest_max?: string | null;
  rate_kind?: string | null; rate_type?: string | null;
  rate_period_days?: number | null; term_min?: number | null; term_max?: number | null;
  min_credit_score?: number | null; eligibility_notes?: string | null;
  required_documents?: Array<{ category: string; stage?: number }> | null; // LENDER_PRODUCT_PARITY_v1
};

type UploadRow = { id: string; filename: string; mime_type: string; created_at: string };

function authHeader() {
  return { Authorization: `Bearer ${sessionStorage.getItem("lender_token")}` };
}

const EMPTY_FORM: ProductCoreForm = {
  productName: "",
  category: "TERM_LOAN",
  country: "CA",
  minAmount: "",
  maxAmount: "",
  rateKind: "apr",
  minRate: "",
  maxRate: "",
  ratePeriodDays: "",
  termMin: "",
  termMax: "",
  commission: "",
  creditBand: "",
  eligibilityNotes: "",
};

function formFromProduct(p: Product): ProductCoreForm {
  return {
    productName: p.name ?? "",
    category: CATEGORY_SHORT_TO_LONG[(p.category ?? "").toUpperCase()] ?? "TERM_LOAN",
    country: (p.country ?? "CA").toUpperCase(),
    minAmount: p.amount_min != null ? formatDollar(String(p.amount_min)) : "",
    maxAmount: p.amount_max != null ? formatDollar(String(p.amount_max)) : "",
    rateKind: (p.rate_kind === "monthly" || p.rate_kind === "factor" ? p.rate_kind : "apr"),
    minRate: p.interest_min ?? "",
    maxRate: p.interest_max ?? "",
    ratePeriodDays: p.rate_period_days != null ? String(p.rate_period_days) : "",
    termMin: p.term_min != null ? String(p.term_min) : "",
    termMax: p.term_max != null ? String(p.term_max) : "",
    commission: "",
    creditBand: bfBandFromMin(p.min_credit_score),
    eligibilityNotes: p.eligibility_notes ?? "",
  };
}

function payloadFromForm(form: ProductCoreForm) {
  return {
    name: form.productName.trim(),
    category: CATEGORY_LONG_TO_SHORT[form.category] ?? "TERM",
    country: form.country,
    amount_min: form.minAmount ? unformatDollar(form.minAmount) : null,
    amount_max: form.maxAmount ? unformatDollar(form.maxAmount) : null,
    interest_min: form.minRate.trim() || null,
    interest_max: form.maxRate.trim() || null,
    rate_kind: form.rateKind,
    rate_type: "FIXED",
    rate_period_days: form.ratePeriodDays ? Number(form.ratePeriodDays) : null,
    term_min: form.termMin ? Number(form.termMin) : null,
    term_max: form.termMax ? Number(form.termMax) : null,
    min_credit_score: bfMinFromBand(form.creditBand),
    eligibility_notes: form.eligibilityNotes.trim() || null,
  };
}

// LENDER_PRODUCT_PARITY_v1 - Required Documents catalog mirrors staff CreateProductModal.
const DOC_ALWAYS = { key: "business_banking_statements_6_months", label: "6 months business banking statements" };
const DOC_CORE: Array<{ key: string; label: string; defaultStage: 1 | 2 }> = [
  { label: "3 years accountant prepared financials", defaultStage: 1 },
  { label: "3 years business tax returns", defaultStage: 1 },
  { label: "PnL \u2013 Interim financials", defaultStage: 1 },
  { label: "Balance Sheet \u2013 Interim financials", defaultStage: 1 },
  { label: "A/R", defaultStage: 1 },
  { label: "A/P", defaultStage: 1 },
  { label: "2 pieces of Government Issued ID", defaultStage: 2 },
  { label: "VOID cheque or PAD", defaultStage: 2 },
  { label: "Personal net worth statement", defaultStage: 2 },
  { label: "2 years personal tax returns (T1 generals)", defaultStage: 2 },
  { label: "Corporate structure / org chart", defaultStage: 2 },
  { label: "Business plan / projections", defaultStage: 2 },
  { label: "Lease agreement (if applicable)", defaultStage: 2 },
  { label: "Debt stack", defaultStage: 2 },
  { label: "Banking connection (Flinks view-only)", defaultStage: 2 },
  { label: "CRA view-only access", defaultStage: 2 },
  { label: "Real estate collateral", defaultStage: 2 },
  { label: "Equipment collateral", defaultStage: 2 },
  { key: "professional_advisors", label: "Professional advisors (CPA / lawyer / insurance)", defaultStage: 2 },
].map((d) => ({ key: (d as any).key ?? d.label.toLowerCase().replace(/[^a-z0-9]+/g, "_"), label: d.label, defaultStage: d.defaultStage as 1 | 2 }));
const docKeyFromLabel = (label: string) => [DOC_ALWAYS, ...DOC_CORE].find((d) => d.label === label)?.key ?? label.toLowerCase().replace(/[^a-z0-9]+/g, "_");

const sectionCard: React.CSSProperties = {
  background: "var(--ui-surface-strong)", border: "1px solid var(--ui-border)",
  borderRadius: 12, padding: 20,
};
const sectionTitle: React.CSSProperties = { margin: 0, fontSize: 18, fontWeight: 700, color: "var(--ui-text)" };
const infoLabel: React.CSSProperties = { fontSize: 12, color: "var(--ui-text-muted)", marginBottom: 2 };
const infoValue: React.CSSProperties = { fontSize: 14, color: "var(--ui-text)", marginBottom: 12, wordBreak: "break-word" };
const thStyle: React.CSSProperties = { textAlign: "left", fontSize: 12, fontWeight: 600, color: "var(--ui-text-muted)", padding: "8px 10px", borderBottom: "1px solid var(--ui-border)" };
const tdStyle: React.CSSProperties = { fontSize: 13, color: "var(--ui-text)", padding: "10px", borderBottom: "1px solid var(--ui-border)", verticalAlign: "middle" };

const INFO_ROWS: { key: keyof Profile; label: string }[] = [
  { key: "website", label: "Website" },
  { key: "phone", label: "Main phone" },
  { key: "contact_name", label: "Contact name" },
  { key: "contact_email", label: "Contact email" },
  { key: "contact_phone", label: "Contact phone (OTP login)" },
  { key: "street", label: "Street address" },
  { key: "city", label: "City" },
  { key: "region", label: "Province / State" },
  { key: "postal_code", label: "Postal code / ZIP" },
  { key: "country", label: "Country" },
  { key: "application_url", label: "Application URL" },
  { key: "announcement", label: "Announcement" },
  { key: "submission_method", label: "Submission method" },
  { key: "submission_email", label: "Submission email" },
  { key: "description", label: "Description" },
];
const EDIT_FIELDS: { key: keyof Profile; label: string; type?: string }[] = [
  { key: "website", label: "Website" },
  { key: "phone", label: "Main phone", type: "tel" },
  { key: "contact_name", label: "Contact name" },
  { key: "contact_email", label: "Contact email", type: "email" },
  { key: "contact_phone", label: "Contact phone (OTP login)", type: "tel" },
  { key: "street", label: "Street address" },
  { key: "city", label: "City" },
  { key: "region", label: "Province / State" },
  { key: "postal_code", label: "Postal code / ZIP" },
  { key: "country", label: "Country" },
  { key: "application_url", label: "Application URL" },
  { key: "announcement", label: "Announcement" },
];

const fmtAmount = (v: number | null | undefined) => (v == null ? "\u2014" : `$${Number(v).toLocaleString()}`);

export default function LenderPortalPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile>({});
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileErr, setProfileErr] = useState<string | null>(null);

  const [editingProfile, setEditingProfile] = useState(false);
  const [profileDraft, setProfileDraft] = useState<Profile>({});
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaveErr, setProfileSaveErr] = useState<string | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [editing, setEditing] = useState<{ id: string | null } | null>(null);
  const [form, setForm] = useState<ProductCoreForm>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [productErr, setProductErr] = useState<string | null>(null);
  const [productSaving, setProductSaving] = useState(false);
  // LENDER_PRODUCT_PARITY_v1 - Required Documents + Active match staff product form minus commission.
  const [prodActive, setProdActive] = useState(true);
  const [checkedDocs, setCheckedDocs] = useState<Set<string>>(new Set([DOC_ALWAYS.key]));
  const [docStages, setDocStages] = useState<Map<string, 1 | 2>>(new Map());

  const [uploads, setUploads] = useState<UploadRow[]>([]);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!sessionStorage.getItem("lender_token")) {
      navigate("/lender-portal/login", { replace: true });
    }
  }, [navigate]);

  const loadProducts = useCallback(async () => {
    try {
      const data = await api<Product[]>("/api/lender/products", { headers: authHeader() });
      setProducts(Array.isArray(data) ? data : []);
      setProductErr(null);
    } catch (e) {
      setProductErr(e instanceof Error ? e.message : "Failed to load products");
    } finally {
      setProductsLoaded(true);
    }
  }, []);

  const loadUploads = useCallback(async () => {
    try {
      const data = await api<UploadRow[]>("/api/lender/uploads", { headers: authHeader() });
      setUploads(Array.isArray(data) ? data : []);
    } catch {
      // uploads list is non-fatal
    }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const data = await api<Profile>("/api/lender/me", { headers: authHeader() });
        setProfile(data ?? {});
      } catch (e) {
        setProfileErr(e instanceof Error ? e.message : "Failed to load profile");
      } finally {
        setProfileLoaded(true);
      }
    })();
    void loadProducts();
    void loadUploads();
  }, [loadProducts, loadUploads]);

  function openProfileEdit() {
    setProfileDraft({ ...profile });
    setProfileSaveErr(null);
    setEditingProfile(true);
  }

  async function saveProfile() {
    setProfileSaving(true); setProfileSaveErr(null);
    try {
      const { name: _companyName, ...editable } = profileDraft;
      const updated = await api<Profile>("/api/lender/me", { method: "PATCH", body: JSON.stringify(editable), headers: authHeader() });
      setProfile(updated ?? profileDraft);
      setEditingProfile(false);
    } catch (e) {
      setProfileSaveErr(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setProfileSaving(false);
    }
  }

  function setField(key: string, value: string | boolean) {
    setForm((p) => ({ ...p, [key]: value }));
    setFormErrors((p) => { const n = { ...p }; delete n[key]; return n; });
  }

  function openCreate() {
    setForm(EMPTY_FORM);
    setFormErrors({});
    setProductErr(null);
    setProdActive(true);
    setCheckedDocs(new Set([DOC_ALWAYS.key]));
    setDocStages(new Map());
    setEditing({ id: null });
  }

  function openEdit(p: Product) {
    setForm(formFromProduct(p));
    setFormErrors({});
    setProductErr(null);
    setProdActive(p.active !== false);
    const docs = new Set<string>([DOC_ALWAYS.key]);
    const stages = new Map<string, 1 | 2>();
    for (const d of p.required_documents ?? []) {
      if (!d?.category) continue;
      const key = docKeyFromLabel(String(d.category));
      docs.add(key);
      stages.set(key, Number(d.stage) === 2 ? 2 : 1);
    }
    setCheckedDocs(docs);
    setDocStages(stages);
    setEditing({ id: p.id });
  }

  async function saveProduct() {
    const errs: Record<string, string> = {};
    if (!form.productName.trim()) errs.productName = "Product name is required.";
    if (!form.minAmount.trim() && !form.maxAmount.trim()) errs.amount = "Amount range is required.";
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    setProductSaving(true);
    setProductErr(null);
    const isEdit = Boolean(editing?.id);
    try {
      const requiredDocuments = Array.from(checkedDocs).map((key) => {
        const found = [DOC_ALWAYS, ...DOC_CORE].find((d) => d.key === key);
        const defaultStage = (found as any)?.defaultStage ?? 1;
        return { category: found?.label ?? key, required: true, description: null, stage: (docStages.get(key) ?? defaultStage) as 1 | 2 };
      });
      await api(isEdit ? `/api/lender/products/${editing?.id}` : "/api/lender/products", {
        method: isEdit ? "PATCH" : "POST",
        body: JSON.stringify({ ...payloadFromForm(form), active: prodActive, required_documents: requiredDocuments }),
        headers: authHeader(),
      });
      setEditing(null);
      void loadProducts();
    } catch (e) {
      setProductErr(e instanceof Error ? e.message : "Failed to save product");
    } finally {
      setProductSaving(false);
    }
  }

  async function uploadFile(file: File) {
    setUploading(true);
    setUploadErr(null);
    try {
      const body = new FormData();
      body.append("file", file);
      await api("/api/lender/uploads", { method: "POST", body, headers: authHeader() });
      void loadUploads();
    } catch (e) {
      setUploadErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
    <div className="page" style={{ maxWidth: 1180, margin: "0 auto", padding: 16 }}>
      {/* BF_PORTAL_LENDER_HEADER_v1 - staff-style portal header with the BF logo,
          Boreal Financial Group name, and a graceful Welcome line. */}
      <header
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 12, height: 68, margin: "0 0 20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flexWrap: "wrap" }}>
          <img src={logoWhite} alt="Boreal Financial" style={{ height: 34, width: "auto", display: "block", filter: "brightness(0) invert(1)" }} /> {/* LENDER_HEADER_WHITE_v2 */}
          <span style={{ fontSize: 20, fontWeight: 700, color: "#ffffff" }}>Boreal Financial Group</span>
          <span style={{ fontSize: 15, color: "rgba(255,255,255,0.85)", marginLeft: 8 }}>
            {(() => {
              const first = (profile.contact_name || "").trim().split(/\s+/)[0];
              const lender = (profile.name || "").trim();
              return `Welcome${first ? " " + first : ""}${lender ? " - " + lender : ""}`;
            })()}
          </span>
        </div>
        <button
          className="ui-button"
          onClick={() => { sessionStorage.removeItem("lender_token"); navigate("/lender-portal/login"); }}
        >
          Sign out
        </button>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 380px) 1fr", gap: 20, alignItems: "start" }}>
        <section style={sectionCard}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <h2 style={sectionTitle}>Company information</h2>
            <button className="ui-button" onClick={openProfileEdit} disabled={!profileLoaded}>Edit</button>
          </div>
          {/* BF_PORTAL_LENDER_BLURBS_v1 */}
          <p style={{ fontSize: 13, color: "var(--ui-text-muted)", margin: "0 0 14px", lineHeight: 1.5 }}>
            Welcome to your portal. Please ensure all your company information is correct.
          </p>
          {!profileLoaded && <div style={{ fontSize: 13, color: "var(--ui-text-muted)" }}>Loading...</div>}
          {profileLoaded && (
            <>
              <div style={infoLabel}>Company name</div>
              <div style={{ ...infoValue, fontWeight: 600 }}>{profile.name || "\u2014"}</div>
              {INFO_ROWS.map((r) => (
                <div key={r.key}>
                  <div style={infoLabel}>{r.label}</div>
                  <div style={infoValue}>{profile[r.key] || "\u2014"}</div>
                </div>
              ))}
              {profileErr && <p style={{ fontSize: 13, color: "#ef4444" }}>{profileErr}</p>}
            </>
          )}
        </section>

        <section style={sectionCard}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <h2 style={sectionTitle}>Your products</h2>
            <button className="ui-button ui-button--primary" onClick={openCreate}>+ Create Product</button>
          </div>
          {/* BF_PORTAL_LENDER_BLURBS_v1 */}
          <p style={{ fontSize: 13, color: "var(--ui-text-muted)", margin: "0 0 14px", lineHeight: 1.5 }}>
            Please check the current products we have in our system. You can add or edit to ensure we
            are promoting all your products with the most correct information possible. If your products
            have different requirements for different levels of funding then create each level. Example:
            a LOC from $50,000 to $100,000 has required documents A; a LOC from $100,001 to $250,000 has
            required documents A, B, and C. If you need any further clarification please email{" "}
            <a href="mailto:info@boreal.financial" style={{ color: "var(--ui-accent-blue, #2563eb)" }}>info@boreal.financial</a>.
          </p>
          {!productsLoaded && <div style={{ fontSize: 13, color: "var(--ui-text-muted)" }}>Loading...</div>}
          {productsLoaded && products.length === 0 && (
            <div style={{ fontSize: 13, color: "var(--ui-text-muted)" }}>No products yet. Click "+ Create Product" to create one.</div>
          )}
          {products.length > 0 && (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>Product</th>
                  <th style={thStyle}>Category</th>
                  <th style={thStyle}>Country</th>
                  <th style={thStyle}>Min</th>
                  <th style={thStyle}>Max</th>
                  <th style={thStyle}>Active</th>
                  <th style={thStyle}></th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>{p.name}</td>
                    <td style={tdStyle}>{CATEGORY_LABELS[CATEGORY_SHORT_TO_LONG[(p.category ?? "").toUpperCase()] ?? ""] ?? p.category}</td>
                    <td style={tdStyle}>{p.country === "CA" ? "Canada" : p.country === "US" ? "United States" : "Both"}</td>
                    <td style={tdStyle}>{fmtAmount(p.amount_min)}</td>
                    <td style={tdStyle}>{fmtAmount(p.amount_max)}</td>
                    <td style={tdStyle}>
                      <span style={{
                        display: "inline-block", padding: "2px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600,
                        background: p.active ? "#dcfce7" : "#f3f4f6", color: p.active ? "#166534" : "#6b7280",
                      }}>
                        {p.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      <button className="ui-button" onClick={() => openEdit(p)}>Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {productErr && !editing && <p style={{ fontSize: 13, color: "#ef4444", marginTop: 10 }}>{productErr}</p>}
        </section>
      </div>

      <section style={{ ...sectionCard, marginTop: 20 }}>
        <h2 style={{ ...sectionTitle, marginBottom: 10 }}>Product sheets &amp; marketing</h2>
        {/* BF_PORTAL_LENDER_BLURBS_v1 */}
        <p style={{ fontSize: 13, color: "var(--ui-text-muted)", margin: "0 0 8px", lineHeight: 1.5 }}>
          Please provide any marketing or product information sheets so we can promote your products to our clients.
        </p>
        <p style={{ fontSize: 13, color: "var(--ui-text-muted)", margin: "0 0 12px" }}>
          Upload product PDFs and marketing material. Boreal uses these to train Maya, our AI
          assistant, so it can represent your products accurately.
        </p>
        <input
          ref={fileInput}
          type="file"
          accept=".pdf,.doc,.docx,.txt,.md"
          disabled={uploading}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadFile(f); }}
        />
        {uploading && <p style={{ fontSize: 13, color: "var(--ui-text-muted)" }}>Uploading...</p>}
        {uploadErr && <p style={{ fontSize: 13, color: "#ef4444" }}>{uploadErr}</p>}
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
          {uploads.map((u) => (
            <div key={u.id} style={{ fontSize: 13, color: "var(--ui-text)", display: "flex", justifyContent: "space-between", gap: 12 }}>
              <span>{u.filename}</span>
              <span style={{ color: "var(--ui-text-muted)" }}>{new Date(u.created_at).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      </section>

      {editingProfile && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.5)" }} onClick={() => setEditingProfile(false)} />
          <div style={{
            position: "relative", background: "var(--ui-surface-strong)", borderRadius: 16, width: "min(560px, 95vw)",
            maxHeight: "90vh", overflowY: "auto", padding: 32, boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
          }}>
            <button onClick={() => setEditingProfile(false)} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", fontSize: 22, color: "var(--ui-text-muted)", cursor: "pointer" }}>x</button>
            <h2 style={{ margin: "0 0 24px", fontSize: 22, fontWeight: 700, color: "var(--ui-text)" }}>Edit Company Information</h2>
            {profileSaveErr && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#dc2626", fontSize: 13 }}>
                {profileSaveErr}
              </div>
            )}
            <Field label="Company name">
              <input value={profileDraft.name ?? ""} readOnly disabled style={{ ...inputStyle, opacity: 0.6 }} />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {EDIT_FIELDS.map((f) => (
                <Field key={f.key} label={f.label}>
                  <input
                    type={f.type ?? "text"}
                    value={profileDraft[f.key] ?? ""}
                    onChange={(e) => setProfileDraft({ ...profileDraft, [f.key]: e.target.value })}
                    style={inputStyle}
                  />
                </Field>
              ))}
            </div>
            {/* LENDER_COMPANY_PARITY_v1 - submission method + email, same as staff form */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Submission method">
                <select
                  value={profileDraft.submission_method ?? ""}
                  onChange={(e) => setProfileDraft({ ...profileDraft, submission_method: e.target.value })}
                  style={inputStyle}
                >
                  <option value="">Select method...</option>
                  <option value="EMAIL">Email</option>
                  <option value="API">API</option>
                  <option value="GOOGLE_SHEET">Google Sheet</option>
                </select>
              </Field>
              {(profileDraft.submission_method ?? "").toUpperCase() === "EMAIL" && (
                <Field label="Submission email">
                  <input
                    type="email"
                    value={profileDraft.submission_email ?? ""}
                    onChange={(e) => setProfileDraft({ ...profileDraft, submission_email: e.target.value })}
                    style={inputStyle}
                  />
                </Field>
              )}
            </div>
            <Field label="Description">
              <textarea
                rows={3}
                value={profileDraft.description ?? ""}
                onChange={(e) => setProfileDraft({ ...profileDraft, description: e.target.value })}
                style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
              />
            </Field>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 24 }}>
              <button className="ui-button" onClick={() => setEditingProfile(false)} disabled={profileSaving}>Cancel</button>
              <button className="ui-button ui-button--primary" onClick={() => void saveProfile()} disabled={profileSaving}>
                {profileSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.5)" }} onClick={() => setEditing(null)} />
          <div style={{
            position: "relative", background: "var(--ui-surface-strong)", borderRadius: 16, width: "min(680px, 95vw)",
            maxHeight: "90vh", overflowY: "auto", padding: 32, boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
          }}>
            <button onClick={() => setEditing(null)} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", fontSize: 22, color: "var(--ui-text-muted)", cursor: "pointer" }}>x</button>
            <h2 style={{ margin: "0 0 24px", fontSize: 22, fontWeight: 700, color: "var(--ui-text)" }}>{editing.id ? "Edit Product" : "Create New Product"}</h2>
            {productErr && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#dc2626", fontSize: 13 }}>
                {productErr}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <ProductCoreFields form={form} set={setField} errors={formErrors} showCommission={false} />
              {/* LENDER_PRODUCT_PARITY_v1 - Required Documents mirrors staff form */}
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ui-text)", marginBottom: 8 }}>Required Documents</div>
                <div style={{ border: "1px solid var(--ui-border)", borderRadius: 8, padding: 12, marginBottom: 10, background: "var(--ui-surface)" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: "var(--ui-text-muted)", marginBottom: 6 }}>ALWAYS REQUIRED</div>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--ui-text)" }}>
                    <input type="checkbox" checked readOnly disabled /> {DOC_ALWAYS.label}
                    <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--ui-text-muted)" }}>Stage 1 (locked)</span>
                  </label>
                </div>
                <div style={{ border: "1px solid var(--ui-border)", borderRadius: 8, padding: 12, background: "var(--ui-surface)" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: "var(--ui-text-muted)", marginBottom: 6 }}>CORE UNDERWRITING PACK</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    {DOC_CORE.map((d) => {
                      const on = checkedDocs.has(d.key);
                      const stage = docStages.get(d.key) ?? d.defaultStage;
                      return (
                        <div key={d.key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--ui-text)" }}>
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() => {
                              setCheckedDocs((prev) => {
                                const next = new Set(prev);
                                if (next.has(d.key)) next.delete(d.key); else next.add(d.key);
                                return next;
                              });
                            }}
                          />
                          <span style={{ flex: 1 }}>{d.label}</span>
                          {on && (
                            <button
                              type="button"
                              className="ui-button"
                              style={{ fontSize: 11, padding: "2px 8px" }}
                              onClick={() => setDocStages((prev) => { const next = new Map(prev); next.set(d.key, (stage === 1 ? 2 : 1) as 1 | 2); return next; })}
                            >
                              Stage {stage}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              {/* LENDER_PRODUCT_PARITY_v1 - Active toggle */}
              <label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, fontSize: 14, fontWeight: 600, color: "var(--ui-text)" }}>
                <input type="checkbox" checked={prodActive} onChange={(e) => setProdActive(e.target.checked)} /> Active
              </label>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 24 }}>
              <button className="ui-button" onClick={() => setEditing(null)} disabled={productSaving}>Cancel</button>
              <button className="ui-button ui-button--primary" onClick={() => void saveProduct()} disabled={productSaving}>
                {productSaving ? "Saving..." : editing.id ? "Save Changes" : "Save Product"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
