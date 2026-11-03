// BF_PORTAL_v865_BROKER_TOOLS_1_FUNDING_CONDITIONS - the application's Funding tab: every condition between Accepted and Funded,
// with owner, person, due date, status and document. The file moves to Funded only when all are cleared or waived.
import { useCallback, useEffect, useState } from "react";
import { api, rawApiFetch } from "@/api";
import { Chip, ErrorLine, card, dangerButton, errorText, h3, input, label, muted, primaryButton, row, secondaryButton, type Tone } from "./ui";
import { OWNER_LABEL, STATUS_LABEL } from "./fundingGate";
import { quotesApi } from "@/quotes/quotesApi";

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
  const [titleErr, setTitleErr] = useState<string | null>(null);
  // v884: null = not known yet (the button stays usable); false = no lender offer on the file, so the button is off with a reason.
  const [hasOffer, setHasOffer] = useState<boolean | null>(null);
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
    let live = true;
    void quotesApi.list(applicationId)
      .then((r) => { if (live) setHasOffer(Array.isArray(r?.offers) ? r.offers.length > 0 : null); })
      .catch(() => { if (live) setHasOffer(null); });
    return () => { live = false; };
  }, [applicationId]);
  useEffect(() => {
    void api.get<{ people: Person[] }>("/api/broker-tools/people").then((r) => setPeople(Array.isArray(r?.people) ? r.people : [])).catch(() => setPeople([]));
  }, []);

  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    setBusy(true); setErr(null); setMsg(null);
    try { await fn(); if (ok) setMsg(ok); await load(); } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  };

  // v884: the server answers these with the fresh list and how many were added; show that list straight away.
  type AddedPayload = { conditions?: Condition[]; added?: number };
  const bulk = (path: "from-offer" | "from-templates") => {
    setBusy(true); setErr(null); setMsg(null);
    void (async () => {
      try {
        const r = await api.post<AddedPayload>(`${base(applicationId)}/${path}`);
        if (Array.isArray(r?.conditions)) setList(r.conditions); else await load();
        const n = typeof r?.added === "number" ? r.added : null;
        if (path === "from-templates") {
          setMsg(n === 0 ? "No template conditions were added. Either none are set up for this lender or product (Settings > Deal tools), or they are already on this file."
            : n === null ? "Template conditions added." : `${n} template condition${n === 1 ? "" : "s"} added.`);
        } else {
          setMsg(n === 0 ? "No conditions were added. The lender's offer has no conditions listed in its notes, or they are already on this file."
            : n === null ? "Conditions added from the lender's offer." : `${n} condition${n === 1 ? "" : "s"} added from the lender's offer.`);
        }
        if (n === null && !Array.isArray(r?.conditions)) await load();
      } catch (e) {
        const status = (e as { status?: number })?.status;
        if (path === "from-offer" && status === 404) { setHasOffer(false); setErr("There is no lender offer on this file yet."); }
        else setErr(errorText(e));
      } finally { setBusy(false); }
    })();
  };

  const add = () => {
    if (!form.title.trim()) { setTitleErr("Type the condition before you add it."); return; }
    setTitleErr(null);
    return run(async () => {
    await api.post(base(applicationId), { ...form, assigned_user_id: form.assigned_user_id || null, due_date: form.due_date || null });
    setForm({ title: "", owner: "staff", assigned_user_id: "", due_date: "", requires_document: false });
  });
  };
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
          <button type="button" style={secondaryButton} disabled={busy || hasOffer === false} aria-describedby={hasOffer === false ? "conditions-no-offer" : undefined} onClick={() => bulk("from-offer")}>Add from the lender's offer</button>
          <button type="button" style={secondaryButton} disabled={busy} onClick={() => bulk("from-templates")}>Add from templates</button>
        </div>
        {hasOffer === false && <p id="conditions-no-offer" data-testid="conditions-no-offer" style={muted}>"Add from the lender's offer" works once a lender has sent an offer on this file (Lenders tab).</p>}
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
                  <span style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>{c.source === "offer" ? "From the offer" : c.source === "template" ? "From a template" : c.source === "lender_api" ? "From the lender (API)" : "Added by staff"}</span>
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
            <input style={{ ...input, ...(titleErr ? { borderColor: "var(--ui-text-danger)" } : {}) }} value={form.title} placeholder="e.g. Signed insurance certificate"
              aria-invalid={titleErr ? true : undefined} aria-describedby={titleErr ? "condition-title-error" : undefined}
              onChange={(e) => { setForm({ ...form, title: e.target.value }); if (titleErr && e.target.value.trim()) setTitleErr(null); }} />
            {titleErr && <span id="condition-title-error" role="alert" style={{ fontSize: 13, fontWeight: 500, color: "var(--ui-text-danger)" }}>{titleErr}</span>}
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
