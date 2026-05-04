// BF_PORTAL_BLOCK_v88_BI_LENDER_USER_MGMT_v1
import { useEffect, useState } from "react";
import { listLenderUsers, createLenderUser, setLenderUserDisabled, type LenderUser } from "@/api/lenderUsers";

type Props = { lenderId: string; lenderName?: string };

export default function LenderUsersPanel({ lenderId, lenderName }: Props) {
  const [users, setUsers] = useState<LenderUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: "", phone: "", first_name: "", last_name: "" });
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setLoading(true);
    setErr(null);
    try {
      const u = await listLenderUsers(lenderId);
      setUsers(u);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, [lenderId]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      await createLenderUser(lenderId, form);
      setForm({ email: "", phone: "", first_name: "", last_name: "" });
      setShowForm(false);
      await refresh();
    } catch (e: any) {
      setErr(e?.message ?? "Could not create user");
    } finally {
      setBusy(false);
    }
  }

  async function onToggle(u: LenderUser) {
    setBusy(true); setErr(null);
    try {
      await setLenderUserDisabled(u.id, !u.disabled);
      await refresh();
    } catch (e: any) {
      setErr(e?.message ?? "Could not update status");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="lender-users-panel" style={{ marginTop: 16, padding: 16, border: "1px solid var(--ui-border, #e5e7eb)", borderRadius: 8 }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <h3 style={{ margin: 0 }}>Users for {lenderName ?? "this lender"}</h3>
          <small style={{ color: "var(--ui-text-muted, #64748b)" }}>People who can log into the lender portal on this lender's behalf.</small>
        </div>
        <button type="button" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "+ Add User"}
        </button>
      </header>

      {err && <div className="form-error" style={{ marginBottom: 8, color: "#dc2626" }}>{err}</div>}

      {showForm && (
        <form onSubmit={onCreate} style={{ display: "grid", gap: 8, marginBottom: 16, padding: 12, background: "var(--ui-bg-subtle, #f8fafc)", borderRadius: 6 }}>
          <input placeholder="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input placeholder="Phone (e.g. +14035551234)" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <input placeholder="First name (optional)" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
            <input placeholder="Last name (optional)" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
          </div>
          <button type="submit" disabled={busy}>{busy ? "Creating…" : "Create user (sends OTP setup)"}</button>
        </form>
      )}

      {loading && <p>Loading…</p>}
      {!loading && users.length === 0 && (
        <p style={{ color: "var(--ui-text-muted, #64748b)" }}>No users yet. Click "Add User" to create one — they'll get a one-time code to log in.</p>
      )}
      {!loading && users.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid var(--ui-border, #e5e7eb)" }}>
              <th style={{ padding: "8px 4px" }}>Name</th>
              <th style={{ padding: "8px 4px" }}>Email</th>
              <th style={{ padding: "8px 4px" }}>Phone</th>
              <th style={{ padding: "8px 4px" }}>Status</th>
              <th style={{ padding: "8px 4px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const name = `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || (u.email ? u.email.split("@")[0] : "—");
              const status = u.disabled ? "Disabled" : "Active";
              return (
                <tr key={u.id} style={{ borderBottom: "1px solid var(--ui-border-subtle, #f1f5f9)" }}>
                  <td style={{ padding: "8px 4px" }}>{name}</td>
                  <td style={{ padding: "8px 4px" }}>{u.email}</td>
                  <td style={{ padding: "8px 4px" }}>{u.phone}</td>
                  <td style={{ padding: "8px 4px" }}>
                    <span className={`status-pill status-pill--${status.toLowerCase()}`}>{status}</span>
                  </td>
                  <td style={{ padding: "8px 4px" }}>
                    <button type="button" onClick={() => onToggle(u)} disabled={busy}>
                      {u.disabled ? "Enable" : "Disable"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
