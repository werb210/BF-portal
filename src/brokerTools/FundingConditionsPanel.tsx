// BF_PORTAL_v865_BROKER_TOOLS_1_FUNDING_CONDITIONS - the application's Funding tab: every condition between Accepted and Funded,
// with owner, person, due date, status and document. The file moves to Funded only when all are cleared or waived.
import { useCallback, useEffect, useState } from "react";
import { api, rawApiFetch } from "@/api";
import { Chip, ErrorLine, card, dangerButton, errorText, h3, input, label, muted, primaryButton, row, secondaryButton, type Tone } from "./ui";
import { OWNER_LABEL, STATUS_LABEL } from "./fundingGate";

export type Condition = {
  id: string; title: string; description: string | null; owner: "staff" | "client" | "lender";
  assigned_user_id: string | null; assigned_name?: string | null; due_date: string | null;
  status: "open" | "received" | "cleared" | "waived"; source: string; requires_document: boolean;
  document_id: string | null; document_url: string | null; note: string | null; waived_reason: string | null;
  client_submitted_at: string | null; overdue: boolean;
};
type Person = { id: string; name: string | null; email: string | null };

export const STATUS_TONE: Record<Condition["status"], Tone> = { open: "amber", received: "blue", cleared: "green", waived: "grey" };

export function summaryText(list: Condition[]): string {
  const open = list.filter((c) => c.status !== "cleared" && c.status !== "waived").length;
  if (!list.length) return "No funding conditions yet. Add the lender's conditions, or add them from your templates.";
  return open === 0 ? "All conditions are cleared or waived. This file can move to Funded." : `${open} of ${list.length} condition${list.length === 1 ? "" : "s"} still open. The file cannot move to Funded until they are cleared or waived.`;
}

const base = (id: string) => `/api/broker-tools/applications/${encodeURIComponent(id)}/conditions`;

export default function FundingConditionsPanel({ applicationId }: { applicationId: string }) {
  const [list, setList] = useState<Condition[] | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ title: "", owner: "staff", assigned_user_id: "", due_date: "", requires_document: false });

  const load = useCallback(async () => {
    try {
      const r = await api.get<{ conditions: Condition[] }>(base(applicationId));
      setList(Array.isArray(r?.conditions) ? r.conditions : []);
    } catch (e) {
      setList([]);
      setErr(errorText(e, "Could not load the funding conditions."));
    }
  }, [applicationId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    void api.get<{ people: Person[] }>("/api/broker-tools/people").then((r) => setPeople(Array.isArray(r?.people) ? r.people : [])).catch(() => setPeople([]));
  }, []);

  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    setBusy(true); setErr(null); setMsg(null);
    try { await fn(); if (ok) setMsg(ok); await load(); } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  };

  const add = () => run(async () => {
    if (!form.title.trim()) throw new Error("Give the condition a title.");
    await api.post(base(applicationId), { ...form, assigned_user_id: form.assigned_user_id || null, due_date: form.due_date || null });
    setForm({ title: "", owner: "staff", assigned_user_id: "", due_date: "", requires_document: false });
  });
  const patch = (c: Condition, body: Record<string, unknown>) => run(() => api.patch(`${base(applicationId)}/${c.id}`, body));
  const waive = (c: Condition) => {
    const reason = window.prompt(`Waive "${c.title}"?\n\nReason (required, kept with the file):`, "");
    if (reason === null) return;
    if (reason.trim().length < 3) { setErr("Say why this condition is waived."); return; }
    void patch(c, { status: "waived", waived_reason: reason.trim() });
  };
  const remove = (c: Condition) => { if (window.confirm(`Remove "${c.title}" from this file?`)) void run(() => api.delete(`${base(applicationId)}/${c.id}`)); };
  const uploadDoc = (c: Condition, file: File | undefined) => {
    if (!file) return;
    void run(async () => {
      const fd = new FormData();
      fd.append("file", file);
      const res = await rawApiFetch(`${base(applicationId)}/${c.id}/document`, { method: "POST", body: fd });
      if (!res.ok) { const j = await res.json().catch(() => ({})) as { message?: string }; throw new Error(j.message ?? `Upload failed (${res.status}).`); }
    }, "Document attached.");
  };

  return (
    <div data-testid="funding-conditions">
      <section style={card}>
        <h3 style={h3}>Funding conditions</h3>
        <p style={muted}>{list ? summaryText(list) : "Loading..."}</p>
        <div style={{ ...row, marginTop: 12 }}>
          <button type="button" style={secondaryButton} disabled={busy} onClick={() => void run(() => api.post(`${base(applicationId)}/from-offer`), "Conditions added from the lender's offer.")}>Add from the lender's offer</button>
          <button type="button" style={secondaryButton} disabled={busy} onClick={() => void run(() => api.post(`${base(applicationId)}/from-templates`), "Template conditions added.")}>Add from templates</button>
        </div>
        <ErrorLine text={err} />
        {msg && <p role="status" style={{ ...muted, color: "var(--ui-text)" }}>{msg}</p>}
      </section>

      {list && list.length > 0 && (
        <section style={card}>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {list.map((c) => (
              <li key={c.id} data-testid={`condition-${c.id}`} style={{ padding: "12px 0", borderTop: "1px solid var(--ui-border)" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <strong style={{ fontSize: 14, color: "var(--ui-text)", overflowWrap: "anywhere" }}>{c.title}</strong>
                  <Chip tone={STATUS_TONE[c.status]}>{STATUS_LABEL[c.status]}</Chip>
                  {c.overdue && <Chip tone="red">Overdue</Chip>}
                  {c.client_submitted_at && c.status === "received" && <Chip tone="blue">Sent by client</Chip>}
                  <span style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>{c.source === "offer" ? "From the offer" : c.source === "template" ? "From a template" : "Added by staff"}</span>
                </div>
                {c.description && <p style={muted}>{c.description}</p>}
                {c.waived_reason && <p style={muted}>Waived: {c.waived_reason}</p>}
                <div style={{ ...row, marginTop: 8 }}>
                  <label style={label}>Owner
                    <select style={input} value={c.owner} disabled={busy} onChange={(e) => void patch(c, { owner: e.target.value })}>
                      {Object.entries(OWNER_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </label>
                  <label style={label}>Person
                    <select style={input} value={c.assigned_user_id ?? ""} disabled={busy} onChange={(e) => void patch(c, { assigned_user_id: e.target.value || null })}>
                      <option value="">Nobody yet</option>
                      {people.map((p) => <option key={p.id} value={p.id}>{p.name ?? p.email ?? "Staff"}</option>)}
                    </select>
                  </label>
                  <label style={label}>Due
                    <input type="date" style={input} value={c.due_date ?? ""} disabled={busy} onChange={(e) => void patch(c, { due_date: e.target.value || null })} />
                  </label>
                  <label style={label}>Document
                    <input type="file" aria-label={`Document for ${c.title}`} disabled={busy} style={{ ...input, padding: 4 }} onChange={(e) => uploadDoc(c, e.target.files?.[0])} />
                  </label>
                  {c.document_id && <span style={{ fontSize: 13 }}>Document on file</span>}
                  {c.document_url && <a href={c.document_url} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: "var(--ui-accent-blue)" }}>Open link</a>}
                </div>
                <div style={{ ...row, marginTop: 8 }}>
                  {c.status !== "cleared" && <button type="button" style={primaryButton} disabled={busy} onClick={() => void patch(c, { status: "cleared" })}>Clear</button>}
                  {c.status !== "waived" && c.status !== "cleared" && <button type="button" style={secondaryButton} disabled={busy} onClick={() => waive(c)}>Waive</button>}
                  {(c.status === "cleared" || c.status === "waived") && <button type="button" style={secondaryButton} disabled={busy} onClick={() => void patch(c, { status: "open" })}>Reopen</button>}
                  <button type="button" style={dangerButton} disabled={busy} onClick={() => remove(c)}>Remove</button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section style={card}>
        <h3 style={h3}>Add a condition</h3>
        <div style={row}>
          <label style={{ ...label, flex: "2 1 240px" }}>Condition
            <input style={input} value={form.title} placeholder="e.g. Signed insurance certificate" onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </label>
          <label style={label}>Owner
            <select style={input} value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })}>
              {Object.entries(OWNER_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          <label style={label}>Person
            <select style={input} value={form.assigned_user_id} onChange={(e) => setForm({ ...form, assigned_user_id: e.target.value })}>
              <option value="">Nobody yet</option>
              {people.map((p) => <option key={p.id} value={p.id}>{p.name ?? p.email ?? "Staff"}</option>)}
            </select>
          </label>
          <label style={label}>Due
            <input type="date" style={input} value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          </label>
          <label style={{ ...label, flexDirection: "row", alignItems: "center", gap: 6, fontWeight: 500 }}>
            <input type="checkbox" checked={form.requires_document} onChange={(e) => setForm({ ...form, requires_document: e.target.checked })} /> Needs a document
          </label>
          <button type="button" style={primaryButton} disabled={busy} onClick={() => void add()}>Add</button>
        </div>
        <p style={muted}>Conditions owned by the client show in the client app for them to send.</p>
      </section>
    </div>
  );
}
