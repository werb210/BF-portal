// BF_PORTAL_v865_BROKER_TOOLS_1_FUNDING_CONDITIONS - funding condition templates: the conditions a lender or lender product always
// asks for (blank lender = every deal). Staff add them to a file with "Add from templates" on its Funding tab.
import { useCallback, useEffect, useState } from "react";
import { api } from "@/api";
import { Chip, ErrorLine, card, dangerButton, errorText, h3, input, label, muted, primaryButton, row, secondaryButton, table, td, th } from "./ui";
import { OWNER_LABEL } from "./fundingGate";

type Template = { id: string; title: string; description: string | null; owner: string; due_days: number | null; requires_document: boolean; lender_id: string | null; lender_product_id: string | null; lender_name: string | null; product_name: string | null; active: boolean };
type Lender = { id: string; name: string };
type Product = { id: string; name: string; lender_id: string };

const EMPTY = { id: "", title: "", description: "", owner: "staff", due_days: "", requires_document: false, lender_id: "", lender_product_id: "", active: true };

export default function ConditionTemplatesSettings({ isAdmin }: { isAdmin: boolean }) {
  const [list, setList] = useState<Template[]>([]);
  const [lenders, setLenders] = useState<Lender[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState({ ...EMPTY });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { const r = await api.get<{ templates: Template[] }>("/api/broker-tools/condition-templates"); setList(r?.templates ?? []); }
    catch (e) { setErr(errorText(e, "Could not load the templates.")); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    void api.get<any>("/api/broker-tools/lender-options").then((r) => { setLenders(r?.lenders ?? []); setProducts(r?.products ?? []); }).catch(() => undefined);
  }, []);

  const save = async () => {
    setBusy(true); setErr(null);
    try {
      const body = { ...form, due_days: form.due_days === "" ? null : Number(form.due_days), lender_id: form.lender_id || null, lender_product_id: form.lender_product_id || null };
      if (form.id) await api.put(`/api/broker-tools/condition-templates/${form.id}`, body);
      else await api.post("/api/broker-tools/condition-templates", body);
      setForm({ ...EMPTY });
      await load();
    } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  };
  const remove = async (t: Template) => {
    if (!window.confirm(`Delete the template "${t.title}"? Conditions already on files stay.`)) return;
    try { await api.delete(`/api/broker-tools/condition-templates/${t.id}`); await load(); } catch (e) { setErr(errorText(e)); }
  };

  return (
    <section style={card} data-testid="condition-templates">
      <h3 style={h3}>Funding condition templates</h3>
      <p style={muted}>Conditions a lender or lender product always asks for before funding. Leave the lender blank for conditions on every deal.</p>
      <div style={{ overflowX: "auto", marginTop: 12 }}>
        <table style={table}>
          <thead><tr><th style={th}>Condition</th><th style={th}>Lender / product</th><th style={th}>Owner</th><th style={th}>Due</th><th style={th}></th></tr></thead>
          <tbody>
            {list.length === 0 && <tr><td style={td} colSpan={5}>No templates yet.</td></tr>}
            {list.map((t) => (
              <tr key={t.id}>
                <td style={td}><strong>{t.title}</strong>{t.requires_document ? " (document)" : ""}{!t.active && <> <Chip tone="grey">Off</Chip></>}{t.description && <div style={muted}>{t.description}</div>}</td>
                <td style={td}>{t.lender_name ?? "Every lender"}{t.product_name ? ` / ${t.product_name}` : ""}</td>
                <td style={td}>{OWNER_LABEL[t.owner] ?? t.owner}</td>
                <td style={td}>{t.due_days === null ? "-" : `${t.due_days} days`}</td>
                <td style={td}>{isAdmin && <div style={row}>
                  <button type="button" style={secondaryButton} onClick={() => setForm({ id: t.id, title: t.title, description: t.description ?? "", owner: t.owner, due_days: t.due_days === null ? "" : String(t.due_days), requires_document: t.requires_document, lender_id: t.lender_id ?? "", lender_product_id: t.lender_product_id ?? "", active: t.active })}>Edit</button>
                  <button type="button" style={dangerButton} onClick={() => void remove(t)}>Delete</button>
                </div>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {isAdmin && (
        <div style={{ marginTop: 16 }}>
          <div style={row}>
            <label style={{ ...label, flex: "2 1 220px" }}>Condition<input style={input} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
            <label style={label}>Lender
              <select style={input} value={form.lender_id} onChange={(e) => setForm({ ...form, lender_id: e.target.value, lender_product_id: "" })}>
                <option value="">Every lender</option>
                {lenders.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </label>
            <label style={label}>Product
              <select style={input} value={form.lender_product_id} onChange={(e) => setForm({ ...form, lender_product_id: e.target.value })} disabled={!form.lender_id}>
                <option value="">Every product</option>
                {products.filter((p) => p.lender_id === form.lender_id).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            <label style={label}>Owner
              <select style={input} value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })}>
                {Object.entries(OWNER_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            <label style={{ ...label, width: 110 }}>Due in days<input style={input} inputMode="numeric" value={form.due_days} onChange={(e) => setForm({ ...form, due_days: e.target.value })} /></label>
          </div>
          <div style={{ ...row, marginTop: 8 }}>
            <label style={{ ...label, flex: "2 1 300px" }}>Description (optional)<input style={input} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
            <label style={{ ...label, flexDirection: "row", alignItems: "center", gap: 6, fontWeight: 500 }}><input type="checkbox" checked={form.requires_document} onChange={(e) => setForm({ ...form, requires_document: e.target.checked })} /> Needs a document</label>
            <label style={{ ...label, flexDirection: "row", alignItems: "center", gap: 6, fontWeight: 500 }}><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> On</label>
            <button type="button" style={primaryButton} disabled={busy || !form.title.trim()} onClick={() => void save()}>{form.id ? "Save template" : "Add template"}</button>
            {form.id && <button type="button" style={secondaryButton} onClick={() => setForm({ ...EMPTY })}>Cancel</button>}
          </div>
        </div>
      )}
      <ErrorLine text={err} />
    </section>
  );
}
