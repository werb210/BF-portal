// BF_PORTAL_v946_OFFER_STEPS - Offer tab, step 3 "Conditions before funding" (Todd, Nov 12 2026: "I would never hand
// this to a broker and expect them to know how to use it"). One line per condition with a tick box; grouped by who has
// to act. Due date, who follows up, attach a document, "not needed" and remove sit behind More on each line.
// Same server as before (/api/broker-tools/applications/:id/conditions); only the screen changed.
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { api, rawApiFetch } from "@/api";
import { getErrorMessage } from "@/utils/errors";

export type Condition = {
  id: string; title: string; description: string | null; owner: "staff" | "client" | "lender";
  assigned_user_id: string | null; assigned_name?: string | null; due_date: string | null;
  status: "open" | "received" | "cleared" | "waived"; requires_document: boolean;
  document_id: string | null; document_url: string | null; waived_reason: string | null; client_submitted_at: string | null; overdue: boolean;
};
type Person = { id: string; name: string | null; email: string | null };

const base = (id: string) => `/api/broker-tools/applications/${encodeURIComponent(id)}/conditions`;
const inp: CSSProperties = { padding: "7px 9px", borderRadius: 8, border: "1px solid var(--ui-border)", background: "var(--ui-surface)", color: "var(--ui-text)", fontSize: 13 };
const btn: CSSProperties = { padding: "6px 12px", borderRadius: 8, border: "1px solid var(--ui-border)", background: "var(--ui-surface)", color: "var(--ui-text)", fontWeight: 600, fontSize: 13, cursor: "pointer" };
const pill = (bg: string, fg: string): CSSProperties => ({ padding: "2px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: bg, color: fg, whiteSpace: "nowrap" });
const groupHead: CSSProperties = { fontSize: 11, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--ui-text-muted)", fontWeight: 700, margin: "16px 0 2px" };
const day = (v: string | null) => (v ? String(v).slice(0, 10) : "");

function statusPill(c: Condition) {
  if (c.status === "cleared") return <span style={pill("#dcfce7", "#166534")}>Done</span>;
  if (c.status === "waived") return <span style={pill("#eef0f4", "#4b5563")}>Not needed</span>;
  if (c.status === "received") return <span style={pill("#dbeafe", "#1e40af")}>Received: check it</span>;
  if (c.owner === "client") return <span style={pill("#fef3c7", "#92400e")}>Waiting on client</span>;
  if (c.owner === "lender") return <span style={pill("#fef3c7", "#92400e")}>Waiting on lender</span>;
  return <span style={pill("#eef0f4", "#4b5563")}>To do</span>;
}

const GROUPS: Array<{ owner: Condition["owner"]; title: string }> = [
  { owner: "client", title: "The client must provide (these show in the client's app)" },
  { owner: "staff", title: "We handle" },
  { owner: "lender", title: "The lender handles" },
];

export default function ConditionsChecklist({ applicationId, reloadKey = 0 }: { applicationId: string; reloadKey?: number }) {
  const [list, setList] = useState<Condition[] | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: "", owner: "client" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api.get<{ conditions: Condition[] }>(base(applicationId));
      setList(Array.isArray(r?.conditions) ? r.conditions : []);
    } catch (e) { setErr(getErrorMessage(e, "The conditions could not be loaded.")); setList([]); }
  }, [applicationId]);
  useEffect(() => { void load(); }, [load, reloadKey]);
  useEffect(() => { void api.get<{ people: Person[] }>("/api/broker-tools/people").then((r) => setPeople(Array.isArray(r?.people) ? r.people : [])).catch(() => setPeople([])); }, []);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true); setErr(null);
    try { await fn(); await load(); } catch (e) { setErr(getErrorMessage(e, "That could not be saved. Try again.")); } finally { setBusy(false); }
  };
  const patch = (c: Condition, body: Record<string, unknown>) => run(() => api.patch(`${base(applicationId)}/${c.id}`, body));
  const toggle = (c: Condition) => patch(c, { status: c.status === "cleared" ? "open" : "cleared" });
  const notNeeded = (c: Condition) => {
    const reason = window.prompt(`Why is "${c.title}" not needed?`, "");
    if (reason === null) return;
    if (reason.trim().length < 3) { setErr("Say why it is not needed."); return; }
    void patch(c, { status: "waived", waived_reason: reason.trim() });
  };
  const remove = (c: Condition) => { if (window.confirm(`Remove "${c.title}" from this file?`)) void run(() => api.delete(`${base(applicationId)}/${c.id}`)); };
  const attach = (c: Condition, file: File | undefined) => {
    if (!file) return;
    void run(async () => {
      const fd = new FormData();
      fd.append("file", file);
      const res = await rawApiFetch(`${base(applicationId)}/${c.id}/document`, { method: "POST", body: fd });
      if (!res.ok) { const j = (await res.json().catch(() => ({}))) as { message?: string }; throw new Error(j.message ?? `Upload failed (${res.status}).`); }
    });
  };
  const add = () => {
    if (!form.title.trim()) return;
    void run(async () => {
      await api.post(base(applicationId), { title: form.title.trim(), owner: form.owner, assigned_user_id: null, due_date: null, requires_document: false });
      setForm({ title: "", owner: "client" }); setAdding(false);
    });
  };

  const all = list ?? [];
  const done = all.filter((c) => c.status === "cleared" || c.status === "waived").length;
  return (
    <div data-testid="conditions-checklist">
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span data-testid="conditions-count" style={{ fontSize: 14, color: "var(--ui-text-muted)" }}>
          {list === null ? "Loading…" : all.length === 0 ? "No conditions yet." : `${done} of ${all.length} done. The file can move to Funded when all are done or marked not needed.`}
        </span>
        <button type="button" style={{ ...btn, marginLeft: "auto" }} data-testid="condition-add-open" onClick={() => setAdding((v) => !v)}>{adding ? "Close" : "+ Add a condition"}</button>
      </div>
      {adding ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 10 }}>
          <input aria-label="New condition" style={{ ...inp, flex: "1 1 300px" }} placeholder="e.g. Signed insurance certificate" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") add(); }} />
          <select aria-label="Who does it" style={inp} value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })}>
            <option value="client">The client</option><option value="staff">Us</option><option value="lender">The lender</option>
          </select>
          <button type="button" style={{ ...btn, background: "#1e3a8a", borderColor: "#1e3a8a", color: "#fff" }} disabled={busy || !form.title.trim()} data-testid="condition-add" onClick={add}>Add</button>
        </div>
      ) : null}
      {err ? <p role="alert" style={{ fontSize: 13, color: "#b91c1c", margin: "8px 0 0" }}>{err}</p> : null}

      {GROUPS.map((g) => {
        const rows = all.filter((c) => c.owner === g.owner);
        if (!rows.length) return null;
        return (
          <div key={g.owner} data-testid={`conditions-group-${g.owner}`}>
            <div style={groupHead}>{g.title}</div>
            {rows.map((c) => (
              <div key={c.id} data-testid={`condition-${c.id}`} style={{ borderBottom: "1px solid var(--ui-border)", padding: "9px 2px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <input type="checkbox" aria-label={`Done: ${c.title}`} checked={c.status === "cleared"} disabled={busy || c.status === "waived"} onChange={() => void toggle(c)} style={{ width: 18, height: 18, flex: "none" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, textDecoration: c.status === "waived" ? "line-through" : undefined }}>{c.title}</div>
                    {c.status === "waived" && c.waived_reason ? <div style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>Not needed: {c.waived_reason}</div>
                      : c.client_submitted_at ? <div style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>Sent by the client {day(c.client_submitted_at)}</div> : null}
                  </div>
                  {c.assigned_name ? <span style={{ fontSize: 13, color: "var(--ui-text-muted)" }}>{c.assigned_name}</span> : null}
                  {c.due_date && c.status !== "cleared" && c.status !== "waived" ? <span style={{ fontSize: 13, color: c.overdue ? "#b91c1c" : "var(--ui-text-muted)" }}>{c.overdue ? "Overdue" : "Due"} {day(c.due_date)}</span> : null}
                  {c.document_url ? <a href={c.document_url} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: "#1e3a8a", fontWeight: 600 }}>Document</a> : null}
                  {statusPill(c)}
                  <button type="button" style={{ ...btn, padding: "4px 10px" }} aria-expanded={open === c.id} aria-label={`More for ${c.title}`} data-testid={`condition-more-${c.id}`} onClick={() => setOpen(open === c.id ? null : c.id)}>More</button>
                </div>
                {open === c.id ? (
                  <div style={{ margin: "10px 0 4px 30px", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end", fontSize: 12, color: "var(--ui-text-muted)" }}>
                    {c.description ? <p style={{ flexBasis: "100%", margin: 0, fontSize: 13 }}>{c.description}</p> : null}
                    <label>Who does it<br />
                      <select aria-label={`Who does: ${c.title}`} style={inp} value={c.owner} disabled={busy} onChange={(e) => void patch(c, { owner: e.target.value })}>
                        <option value="client">The client</option><option value="staff">Us</option><option value="lender">The lender</option>
                      </select>
                    </label>
                    <label>Followed up by<br />
                      <select aria-label={`Followed up by: ${c.title}`} style={inp} value={c.assigned_user_id ?? ""} disabled={busy} onChange={(e) => void patch(c, { assigned_user_id: e.target.value || null })}>
                        <option value="">Nobody yet</option>{people.map((p) => <option key={p.id} value={p.id}>{p.name ?? p.email ?? "Staff"}</option>)}
                      </select>
                    </label>
                    <label>Due<br /><input aria-label={`Due: ${c.title}`} type="date" style={inp} value={day(c.due_date)} disabled={busy} onChange={(e) => void patch(c, { due_date: e.target.value || null })} /></label>
                    <label>Attach a document<br /><input aria-label={`Attach to: ${c.title}`} type="file" disabled={busy} onChange={(e) => attach(c, e.target.files?.[0])} /></label>
                    {c.status === "waived"
                      ? <button type="button" style={btn} disabled={busy} onClick={() => void patch(c, { status: "open" })}>Needed after all</button>
                      : <button type="button" style={btn} disabled={busy} data-testid={`condition-waive-${c.id}`} onClick={() => notNeeded(c)}>Not needed</button>}
                    <button type="button" style={{ ...btn, color: "#b91c1c" }} disabled={busy} data-testid={`condition-remove-${c.id}`} onClick={() => remove(c)}>Remove</button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
