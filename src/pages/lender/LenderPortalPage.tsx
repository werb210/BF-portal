import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api";

type Product = {
  id: string; name: string; description?: string | null;
  category: string; country: string; active: boolean;
  amount_min?: number | null; amount_max?: number | null;
  interest_min?: string | null; interest_max?: string | null;
  rate_kind?: string | null; rate_type?: string | null;
  min_credit_score?: number | null; eligibility_notes?: string | null;
};

const CATEGORIES = ["LOC", "TERM", "FACTORING", "PO", "EQUIPMENT", "MCA", "MEDIA", "ABL", "SBA", "STARTUP"];
const COUNTRIES = ["CA", "US", "BOTH"];
const RATE_KINDS = ["", "apr", "monthly", "factor"];
const RATE_TYPES = ["", "VARIABLE", "FIXED"];

function authHeader() {
  return { Authorization: `Bearer ${sessionStorage.getItem("lender_token")}` };
}

const EMPTY: Partial<Product> = { name: "", category: "TERM", country: "CA" };

export default function LenderPortalPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [editing, setEditing] = useState<Partial<Product> | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { void load(); }, []);

  async function load() {
    try {
      const data = await api<Product[]>("/api/lender/products", { headers: authHeader() });
      setProducts(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load products");
    } finally {
      setLoaded(true);
    }
  }

  async function save() {
    if (!editing) return;
    setErr(null);
    const isEdit = Boolean(editing.id);
    try {
      await api(isEdit ? `/api/lender/products/${editing.id}` : "/api/lender/products", {
        method: isEdit ? "PATCH" : "POST",
        body: JSON.stringify(editing),
        headers: authHeader(),
      });
      setEditing(null);
      void load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save product");
    }
  }

  const set = (k: keyof Product, v: string) => setEditing((p) => ({ ...(p ?? {}), [k]: v }));

  return (
    <div className="page space-y-4 max-w-3xl mx-auto p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">My Products</h1>
        <div className="flex gap-2">
          <button className="ui-button" onClick={() => navigate("/lender-portal/profile")}>Profile</button>
          <button className="ui-button ui-button--primary" onClick={() => setEditing({ ...EMPTY })}>Add Product</button>
        </div>
      </div>

      {!loaded && <div className="text-sm text-slate-500">Loading…</div>}
      {loaded && products.length === 0 && !editing && (
        <div className="text-sm text-slate-500">No products yet. Click “Add Product” to create one.</div>
      )}

      <div className="space-y-2">
        {products.map((p) => (
          <article key={p.id} className="rounded border p-3 flex items-center justify-between">
            <div>
              <div className="font-medium">{p.name} <span className="text-xs text-slate-500">({p.category} · {p.country})</span></div>
              <div className="text-sm text-slate-600">
                {p.amount_min || p.amount_max ? `$${p.amount_min ?? 0}–$${p.amount_max ?? 0}` : "Amount n/a"}
                {p.interest_min || p.interest_max ? ` · ${p.interest_min ?? "?"}–${p.interest_max ?? "?"}${p.rate_kind ? ` ${p.rate_kind}` : ""}` : ""}
              </div>
            </div>
            <button className="ui-button" onClick={() => setEditing({ ...p })}>Edit</button>
          </article>
        ))}
      </div>

      {editing && (
        <section className="drawer-section space-y-3">
          <div className="drawer-section__title">{editing.id ? "Edit product" : "New product"}</div>
          <input className="w-full border rounded p-2" placeholder="Product name"
            value={editing.name ?? ""} onChange={(e) => set("name", e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <label className="text-sm">Category
              <select className="w-full border rounded p-2" value={editing.category ?? "TERM"} onChange={(e) => set("category", e.target.value)}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="text-sm">Country
              <select className="w-full border rounded p-2" value={editing.country ?? "CA"} onChange={(e) => set("country", e.target.value)}>
                {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="text-sm">Min amount
              <input className="w-full border rounded p-2" inputMode="numeric" value={editing.amount_min ?? ""} onChange={(e) => set("amount_min", e.target.value)} />
            </label>
            <label className="text-sm">Max amount
              <input className="w-full border rounded p-2" inputMode="numeric" value={editing.amount_max ?? ""} onChange={(e) => set("amount_max", e.target.value)} />
            </label>
            <label className="text-sm">Interest min (e.g. 6.4%)
              <input className="w-full border rounded p-2" value={editing.interest_min ?? ""} onChange={(e) => set("interest_min", e.target.value)} />
            </label>
            <label className="text-sm">Interest max
              <input className="w-full border rounded p-2" value={editing.interest_max ?? ""} onChange={(e) => set("interest_max", e.target.value)} />
            </label>
            <label className="text-sm">Rate kind
              <select className="w-full border rounded p-2" value={editing.rate_kind ?? ""} onChange={(e) => set("rate_kind", e.target.value)}>
                {RATE_KINDS.map((c) => <option key={c || "none"} value={c}>{c || "—"}</option>)}
              </select>
            </label>
            <label className="text-sm">Rate type
              <select className="w-full border rounded p-2" value={editing.rate_type ?? ""} onChange={(e) => set("rate_type", e.target.value)}>
                {RATE_TYPES.map((c) => <option key={c || "none"} value={c}>{c || "—"}</option>)}
              </select>
            </label>
            <label className="text-sm">Min credit score
              <input className="w-full border rounded p-2" inputMode="numeric" value={editing.min_credit_score ?? ""} onChange={(e) => set("min_credit_score", e.target.value)} />
            </label>
          </div>
          <textarea className="w-full border rounded p-2" placeholder="Eligibility notes"
            value={editing.eligibility_notes ?? ""} onChange={(e) => set("eligibility_notes", e.target.value)} />
          {err && <p className="text-sm text-red-600">{err}</p>}
          <div className="flex gap-2">
            <button className="ui-button ui-button--primary" onClick={save}>{editing.id ? "Save changes" : "Create product"}</button>
            <button className="ui-button" onClick={() => { setEditing(null); setErr(null); }}>Cancel</button>
          </div>
        </section>
      )}
      {err && !editing && <p className="text-sm text-red-600">{err}</p>}
    </div>
  );
}
