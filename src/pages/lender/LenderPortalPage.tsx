// LENDER_PORTAL_ONE_PAGE_v1 - the entire lender self-service portal on ONE page:
// company profile (editable, company name read-only), products (list / create /
// edit via the SAME staff product form fields), and uploads (product sheets +
// marketing -> lender_documents -> Maya training). No deals page.
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api";
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
  street?: string; city?: string; region?: string; postal_code?: string;
};

type Product = {
  id: string; name: string;
  category: string; type?: string; country: string; active: boolean;
  amount_min?: number | null; amount_max?: number | null;
  interest_min?: string | null; interest_max?: string | null;
  rate_kind?: string | null; rate_type?: string | null;
  rate_period_days?: number | null; term_min?: number | null; term_max?: number | null;
  min_credit_score?: number | null; eligibility_notes?: string | null;
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

const sectionCard: React.CSSProperties = {
  background: "var(--ui-surface-strong)", border: "1px solid var(--ui-border)",
  borderRadius: 12, padding: 20, marginBottom: 20,
};
const sectionTitle: React.CSSProperties = { margin: "0 0 14px", fontSize: 18, fontWeight: 700, color: "var(--ui-text)" };

const PROFILE_FIELDS: { key: keyof Profile; label: string; type?: string }[] = [
  { key: "website", label: "Website" },
  { key: "phone", label: "Main phone", type: "tel" },
  { key: "contact_name", label: "Contact name" },
  { key: "contact_email", label: "Contact email", type: "email" },
  { key: "contact_phone", label: "Contact phone (OTP login)", type: "tel" },
];
const ADDRESS_FIELDS: { key: keyof Profile; label: string }[] = [
  { key: "street", label: "Street address" },
  { key: "city", label: "City" },
  { key: "region", label: "Province / State" },
  { key: "postal_code", label: "Postal code / ZIP" },
];

export default function LenderPortalPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile>({});
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [profileErr, setProfileErr] = useState<string | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [editing, setEditing] = useState<{ id: string | null } | null>(null);
  const [form, setForm] = useState<ProductCoreForm>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [productErr, setProductErr] = useState<string | null>(null);
  const [productSaving, setProductSaving] = useState(false);

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

  async function saveProfile() {
    setProfileSaving(true); setProfileErr(null); setProfileMsg(null);
    try {
      const { name: _companyName, ...editable } = profile;
      void _companyName;
      await api("/api/lender/me", { method: "PATCH", body: JSON.stringify(editable), headers: authHeader() });
      setProfileMsg("Saved.");
    } catch (e) {
      setProfileErr(e instanceof Error ? e.message : "Failed to save");
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
    setEditing({ id: null });
  }

  function openEdit(p: Product) {
    setForm(formFromProduct(p));
    setFormErrors({});
    setProductErr(null);
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
      await api(isEdit ? `/api/lender/products/${editing?.id}` : "/api/lender/products", {
        method: isEdit ? "PATCH" : "POST",
        body: JSON.stringify(payloadFromForm(form)),
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
    <div className="page" style={{ maxWidth: 860, margin: "0 auto", padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "8px 0 20px" }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "var(--ui-text)" }}>{profile.name ? profile.name : "Lender Portal"}</h1>
        <button className="ui-button" onClick={() => { sessionStorage.removeItem("lender_token"); navigate("/lender-portal/login"); }}>Sign out</button>
      </div>
      <section style={sectionCard}>
        <h2 style={sectionTitle}>Company information</h2>
        {!profileLoaded && <div style={{ fontSize: 13, color: "var(--ui-text-muted)" }}>Loading...</div>}
        {profileLoaded && <><Field label="Company name"><input value={profile.name ?? ""} readOnly disabled style={{ ...inputStyle, opacity: 0.6 }} /></Field><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>{PROFILE_FIELDS.map((f) => <Field key={f.key} label={f.label}><input type={f.type ?? "text"} value={profile[f.key] ?? ""} onChange={(e) => setProfile({ ...profile, [f.key]: e.target.value })} style={inputStyle} /></Field>)}</div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>{ADDRESS_FIELDS.map((f) => <Field key={f.key} label={f.label}><input value={profile[f.key] ?? ""} onChange={(e) => setProfile({ ...profile, [f.key]: e.target.value })} style={inputStyle} /></Field>)}</div><Field label="Description"><textarea rows={3} value={profile.description ?? ""} onChange={(e) => setProfile({ ...profile, description: e.target.value })} style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} /></Field>{profileErr && <p style={{ fontSize: 13, color: "#ef4444" }}>{profileErr}</p>}{profileMsg && <p style={{ fontSize: 13, color: "#16a34a" }}>{profileMsg}</p>}<button className="ui-button ui-button--primary" disabled={profileSaving} onClick={() => void saveProfile()}>{profileSaving ? "Saving..." : "Save company info"}</button></>}
      </section>
      <section style={sectionCard}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}><h2 style={{ ...sectionTitle, margin: 0 }}>Your products</h2><button className="ui-button ui-button--primary" onClick={openCreate}>Add product</button></div>
        {!productsLoaded && <div style={{ fontSize: 13, color: "var(--ui-text-muted)" }}>Loading...</div>}
        {productsLoaded && products.length === 0 && !editing && <div style={{ fontSize: 13, color: "var(--ui-text-muted)" }}>No products yet. Click "Add product" to create one.</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{products.map((p) => <article key={p.id} style={{ border: "1px solid var(--ui-border)", borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}><div><div style={{ fontWeight: 600, color: "var(--ui-text)" }}>{p.name} <span style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>({CATEGORY_LABELS[CATEGORY_SHORT_TO_LONG[(p.category ?? "").toUpperCase()] ?? ""] ?? p.category} / {p.country})</span></div><div style={{ fontSize: 13, color: "var(--ui-text-muted)" }}>{p.amount_min != null || p.amount_max != null ? `$${(p.amount_min ?? 0).toLocaleString()} to $${(p.amount_max ?? 0).toLocaleString()}` : "Amount n/a"}{p.interest_min || p.interest_max ? ` | ${p.interest_min ?? "?"} to ${p.interest_max ?? "?"}${p.rate_kind ? ` ${p.rate_kind}` : ""}` : ""}</div></div><button className="ui-button" onClick={() => openEdit(p)}>Edit</button></article>)}</div>
        {productErr && !editing && <p style={{ fontSize: 13, color: "#ef4444", marginTop: 10 }}>{productErr}</p>}
      </section>
      <section style={sectionCard}>
        <h2 style={sectionTitle}>Product sheets &amp; marketing</h2><p style={{ fontSize: 13, color: "var(--ui-text-muted)", margin: "0 0 12px" }}>Upload product PDFs and marketing material. Boreal uses these to train Maya, our AI assistant, so it can represent your products accurately.</p>
        <input ref={fileInput} type="file" accept=".pdf,.doc,.docx,.txt,.md" disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadFile(f); }} />
        {uploading && <p style={{ fontSize: 13, color: "var(--ui-text-muted)" }}>Uploading...</p>}{uploadErr && <p style={{ fontSize: 13, color: "#ef4444" }}>{uploadErr}</p>}
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>{uploads.map((u) => <div key={u.id} style={{ fontSize: 13, color: "var(--ui-text)", display: "flex", justifyContent: "space-between", gap: 12 }}><span>{u.filename}</span><span style={{ color: "var(--ui-text-muted)" }}>{new Date(u.created_at).toLocaleDateString()}</span></div>)}</div>
      </section>
      {editing && <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.5)" }} onClick={() => setEditing(null)} /><div style={{ position: "relative", background: "var(--ui-surface-strong)", borderRadius: 16, width: "min(680px, 95vw)", maxHeight: "90vh", overflowY: "auto", padding: 32, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}><button onClick={() => setEditing(null)} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", fontSize: 22, color: "var(--ui-text-muted)", cursor: "pointer" }}>x</button><h2 style={{ margin: "0 0 24px", fontSize: 22, fontWeight: 700, color: "var(--ui-text)" }}>{editing.id ? "Edit Product" : "Create New Product"}</h2>{productErr && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#dc2626", fontSize: 13 }}>{productErr}</div>}<div style={{ display: "flex", flexDirection: "column", gap: 16 }}><ProductCoreFields form={form} set={setField} errors={formErrors} showCommission={false} /></div><div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 24 }}><button className="ui-button" onClick={() => setEditing(null)} disabled={productSaving}>Cancel</button><button className="ui-button ui-button--primary" onClick={() => void saveProduct()} disabled={productSaving}>{productSaving ? "Saving..." : editing.id ? "Save Changes" : "Save Product"}</button></div></div></div>}
    </div>
  );
}
