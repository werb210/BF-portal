// BF_PORTAL_BLOCK_v91_BI_LENDERS_PAGE_v1
import { useEffect, useState } from "react";
import { biLendersApi, type BiLender, type BiApiKey, type BiNewKeySecret } from "@/api/biLenders";

export default function BiLendersPage() {
  const [lenders, setLenders] = useState<BiLender[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<BiLender>>({ country: "CA" });
  const [keysFor, setKeysFor] = useState<BiLender | null>(null);
  const [keys, setKeys] = useState<BiApiKey[]>([]);
  const [newSecret, setNewSecret] = useState<BiNewKeySecret | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setLoading(true); setErr(null);
    try {
      const r = await biLendersApi.list();
      setLenders(r.lenders ?? []);
    } catch (e: any) { setErr(e?.message ?? "Failed to load BI-lenders"); }
    finally { setLoading(false); }
  }

  useEffect(() => { refresh(); }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null);
    try {
      await biLendersApi.create(form);
      setForm({ country: "CA" }); setShowForm(false); await refresh();
    } catch (e: any) { setErr(e?.message ?? "Could not create"); }
    finally { setBusy(false); }
  }

  async function openKeys(l: BiLender) {
    setKeysFor(l); setKeys([]); setNewSecret(null);
    try { const r = await biLendersApi.listKeys(l.id); setKeys(r.items ?? []); }
    catch (e: any) { setErr(e?.message ?? "Could not load keys"); }
  }

  async function mint() {
    if (!keysFor) return;
    setBusy(true); setErr(null);
    try {
      const s = await biLendersApi.mintKey(keysFor.id);
      setNewSecret(s);
      const r = await biLendersApi.listKeys(keysFor.id);
      setKeys(r.items ?? []);
    } catch (e: any) { setErr(e?.message ?? "Could not mint key"); }
    finally { setBusy(false); }
  }

  async function revoke(keyId: string) {
    if (!keysFor) return;
    setBusy(true); setErr(null);
    try {
      await biLendersApi.revokeKey(keysFor.id, keyId);
      const r = await biLendersApi.listKeys(keysFor.id);
      setKeys(r.items ?? []);
    } catch (e: any) { setErr(e?.message ?? "Could not revoke"); }
    finally { setBusy(false); }
  }

  return (
    <div style={{ padding: 24 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0 }}>BI Lenders</h1>
          <small style={{ color: "var(--ui-text-muted, #64748b)" }}>
            Partner banks that submit PGI applications to Boreal Insurance.
          </small>
        </div>
        <button type="button" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "+ New BI Lender"}
        </button>
      </header>

      {err && <div style={{ marginBottom: 12, color: "#dc2626" }}>{err}</div>}

      {showForm && (
        <form onSubmit={onCreate} style={{ display: "grid", gap: 8, padding: 16, marginBottom: 16, background: "var(--ui-bg-subtle, #f8fafc)", borderRadius: 6 }}>
          <input placeholder="Company name *" required value={form.company_name ?? ""} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
          <input placeholder="Contact full name *" required value={form.contact_full_name ?? ""} onChange={(e) => setForm({ ...form, contact_full_name: e.target.value })} />
          <input type="email" placeholder="Contact email *" required value={form.contact_email ?? ""} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
          <input placeholder="Contact phone (E.164) *" required value={form.contact_phone_e164 ?? ""} onChange={(e) => setForm({ ...form, contact_phone_e164: e.target.value })} />
          <input placeholder="Website (optional)" value={form.website_url ?? ""} onChange={(e) => setForm({ ...form, website_url: e.target.value })} />
          <select value={form.country ?? "CA"} onChange={(e) => setForm({ ...form, country: e.target.value })}>
            <option value="CA">Canada</option><option value="US">United States</option>
          </select>
          <button type="submit" disabled={busy}>{busy ? "Creating…" : "Create BI Lender"}</button>
        </form>
      )}

      {loading && <p>Loading…</p>}
      {!loading && lenders.length === 0 && <p>No BI lenders yet. Click "+ New BI Lender" above.</p>}
      {!loading && lenders.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: 8 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #e5e7eb", textAlign: "left" }}>
              <th style={{ padding: 12 }}>Company</th>
              <th style={{ padding: 12 }}>Contact</th>
              <th style={{ padding: 12 }}>Country</th>
              <th style={{ padding: 12 }}>Status</th>
              <th style={{ padding: 12 }}>API keys</th>
            </tr>
          </thead>
          <tbody>
            {lenders.map((l) => (
              <tr key={l.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: 12 }}>{l.company_name}</td>
                <td style={{ padding: 12 }}>{l.contact_full_name}<br /><small style={{ color: "#64748b" }}>{l.contact_email}</small></td>
                <td style={{ padding: 12 }}>{l.country}</td>
                <td style={{ padding: 12 }}>{l.is_active ? "Active" : "Inactive"}</td>
                <td style={{ padding: 12 }}><button type="button" onClick={() => openKeys(l)}>Manage</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {keysFor && (
        <div style={{ marginTop: 24, padding: 16, border: "1px solid #e5e7eb", borderRadius: 8 }}>
          <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>API keys — {keysFor.company_name}</h3>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={mint} disabled={busy}>+ Mint key</button>
              <button type="button" onClick={() => { setKeysFor(null); setNewSecret(null); }}>Close</button>
            </div>
          </header>

          {newSecret && (
            <div style={{ padding: 12, marginBottom: 12, background: "#fef3c7", border: "1px solid #f59e0b", borderRadius: 6 }}>
              <strong>Copy this key now — it cannot be retrieved later.</strong>
              <pre style={{ margin: "8px 0 0", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{newSecret.secret}</pre>
            </div>
          )}

          {keys.length === 0 && <p>No keys yet.</p>}
          {keys.length > 0 && (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e5e7eb", textAlign: "left" }}>
                  <th style={{ padding: 8 }}>Prefix</th>
                  <th style={{ padding: 8 }}>Status</th>
                  <th style={{ padding: 8 }}>Last used</th>
                  <th style={{ padding: 8 }}>Created</th>
                  <th style={{ padding: 8 }}></th>
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => (
                  <tr key={k.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: 8, fontFamily: "ui-monospace" }}>{k.prefix}…</td>
                    <td style={{ padding: 8 }}>{k.active ? "Active" : "Revoked"}</td>
                    <td style={{ padding: 8 }}>{k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : "—"}</td>
                    <td style={{ padding: 8 }}>{new Date(k.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: 8 }}>{k.active && <button type="button" onClick={() => revoke(k.id)} disabled={busy}>Revoke</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
