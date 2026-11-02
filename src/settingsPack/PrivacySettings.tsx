// BF_PORTAL_v869_SETTINGS_PACK_PRIVACY - Settings > Privacy requests (Admins): record an access, correction or deletion
// request on a contact, export the contact's data, correct it, or carry out the deletion (the 7-year retention and
// legal holds are respected and explained). BF-Server /api/privacy.
import { useCallback, useEffect, useState } from "react";
import { api } from "@/api";
import { Field, Notice, Section, button, cell, danger, errText, input, muted, quiet, when } from "./ui";

type Req = { id: string; contact_id: string | null; contact_label: string | null; kind: "access" | "correction" | "deletion"; status: string; details: string | null; received_via: string | null; requested_at: string; due_at: string; outcome: any; requester_email?: string | null; requester_phone?: string | null };
type Kept = { what: string; why: string; until: string | null };
type Plan = { can_delete: boolean; will_keep: Kept[]; will_delete: string[] };
const KIND: Record<string, string> = { access: "Access (a copy of their data)", correction: "Correction", deletion: "Deletion" };

function download(name: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function RequestPanel({ r, onDone }: { r: Req; onDone: () => void }) {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [changes, setChanges] = useState({ name: "", email: "", phone: "" });
  const [note, setNote] = useState("");
  const [linkId, setLinkId] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  useEffect(() => {
    if (r.kind !== "deletion" || r.status !== "open") return;
    void api.get<{ deletion_plan: Plan | null }>(`/api/privacy/requests/${r.id}`).then((x) => setPlan(x.deletion_plan)).catch((e) => setErr(errText(e, "Could not check what can be deleted.")));
  }, [r]);
  const act = async (fn: () => Promise<unknown>, done: string) => {
    setErr(null); setOk(null);
    try { await fn(); setOk(done); onDone(); } catch (e) { setErr(errText(e, "That did not work.")); }
  };
  return (
    <div style={{ padding: 12, border: "1px solid var(--ui-border)", borderRadius: 10, marginTop: 8 }} data-testid="privacy-panel">
      {/* BF_PORTAL_v869_SETTINGS_PACK - a client's own request from the client app that matched no contact. */}
      {!r.contact_id && r.status === "open" && <>
        <p style={muted}>Sent from the client app by {r.requester_email ?? "a client"}{r.requester_phone ? ` (${r.requester_phone})` : ""}. No contact has that email. Find the contact, then link it before acting on the request.</p>
        <Field id={`pv-link-${r.id}`} label="Contact id"><input id={`pv-link-${r.id}`} value={linkId} onChange={(e) => setLinkId(e.target.value.trim())} placeholder="From the contact's address bar" style={input} /></Field>
        <button type="button" style={button} disabled={!linkId} onClick={() => void act(() => api.post(`/api/privacy/requests/${r.id}/contact`, { contact_id: linkId }), "Contact linked.")}>Link contact</button>
      </>}
      {r.kind === "access" && r.contact_id && <button type="button" style={button} onClick={() => void act(async () => download(`contact-${r.contact_id}.json`, await api.get(`/api/privacy/requests/${r.id}/export`)), "Export downloaded. Send it to the person securely, then mark the request done.")}>Download their data (JSON)</button>}
      {r.kind === "correction" && r.status === "open" && <>
        <Field id={`pv-name-${r.id}`} label="Correct name"><input id={`pv-name-${r.id}`} value={changes.name} onChange={(e) => setChanges({ ...changes, name: e.target.value })} style={input} /></Field>
        <Field id={`pv-email-${r.id}`} label="Correct email"><input id={`pv-email-${r.id}`} value={changes.email} onChange={(e) => setChanges({ ...changes, email: e.target.value })} style={input} /></Field>
        <Field id={`pv-phone-${r.id}`} label="Correct phone"><input id={`pv-phone-${r.id}`} value={changes.phone} onChange={(e) => setChanges({ ...changes, phone: e.target.value })} style={input} /></Field>
        <button type="button" style={button} onClick={() => void act(() => api.post(`/api/privacy/requests/${r.id}/correct`, { changes: Object.fromEntries(Object.entries(changes).filter(([, v]) => v.trim())) }), "Contact corrected (old and new values are in the audit log).")}>Save corrections</button>
      </>}
      {r.kind === "deletion" && r.status === "open" && plan && <>
        {plan.can_delete
          ? <p style={muted}>Nothing on this contact is under the 7-year retention or a legal hold. Deleting removes the contact and its notes, calls, emails, texts, meetings, tasks and bookings.</p>
          : <><p style={muted}>These records must be kept, so they will not be deleted. The person will be opted out of marketing email and texts instead:</p>
            <ul>{plan.will_keep.map((k, i) => <li key={i} style={{ fontSize: 13 }}><strong>{k.what}</strong>: {k.why}{k.until ? ` (until ${k.until})` : ""}</li>)}</ul></>}
        <button type="button" style={danger} onClick={() => { if (window.confirm(plan.can_delete ? "Delete this contact and its activity? This cannot be undone." : "Opt this person out of marketing and close the request?")) void act(() => api.post(`/api/privacy/requests/${r.id}/delete`, {}), plan.can_delete ? "Deleted." : "Records kept; the person is opted out of marketing."); }}>
          {plan.can_delete ? "Delete the contact" : "Opt out and close the request"}
        </button>
      </>}
      {r.status === "open" && r.kind !== "deletion" && <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
        <input aria-label="Note" placeholder="Note (needed to refuse)" value={note} onChange={(e) => setNote(e.target.value)} style={{ ...input, maxWidth: 320 }} />
        <button type="button" style={quiet} onClick={() => void act(() => api.post(`/api/privacy/requests/${r.id}/close`, { status: "completed", note }), "Request marked done.")}>Mark done</button>
        <button type="button" style={quiet} onClick={() => void act(() => api.post(`/api/privacy/requests/${r.id}/close`, { status: "refused", note }), "Request refused.")}>Refuse</button>
      </div>}
      {r.status !== "open" && r.outcome && <pre style={{ fontSize: 12, whiteSpace: "pre-wrap", color: "var(--ui-text)" }}>{JSON.stringify(r.outcome, null, 2)}</pre>}
      <Notice error={err} ok={ok} />
    </div>
  );
}

export default function PrivacySettings() {
  const [rows, setRows] = useState<Req[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [form, setForm] = useState({ contact_id: "", kind: "access", details: "", received_via: "email" });
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const load = useCallback(async () => {
    try { setRows((await api.get<{ requests: Req[] }>("/api/privacy/requests")).requests); } catch (e) { setErr(errText(e, "Could not load privacy requests.")); setRows([]); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const add = async () => {
    setErr(null); setOk(null);
    try { await api.post("/api/privacy/requests", form); setOk("Request recorded. You have 30 days to respond."); setForm({ ...form, contact_id: "", details: "" }); await load(); }
    catch (e) { setErr(errText(e, "Could not record the request.")); }
  };
  return (
    <div data-testid="privacy-settings">
      <Section id="pv-new" title="Record a privacy request" intro="When someone asks for a copy of their information, a correction, or to be deleted. Clients can also ask from the privacy page in the client app; those requests appear below. Every step is recorded in the audit log.">
        <Field id="pv-contact" label="Contact id"><input id="pv-contact" value={form.contact_id} onChange={(e) => setForm({ ...form, contact_id: e.target.value.trim() })} placeholder="From the contact's address bar" style={input} /></Field>
        <Field id="pv-kind" label="Request">
          <select id="pv-kind" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} style={input}>{Object.entries(KIND).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        </Field>
        <Field id="pv-via" label="Received by"><input id="pv-via" value={form.received_via} onChange={(e) => setForm({ ...form, received_via: e.target.value })} style={input} /></Field>
        <Field id="pv-details" label="Details"><textarea id="pv-details" rows={2} value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} style={input} /></Field>
        <button type="button" style={button} disabled={!form.contact_id} onClick={() => void add()}>Record request</button>
        <Notice error={err} ok={ok} />
      </Section>
      <Section id="pv-list" title="Requests" intro="Open requests first, by due date.">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={cell}>Contact</th><th style={cell}>Request</th><th style={cell}>Received</th><th style={cell}>Due</th><th style={cell}>Status</th><th style={cell} /></tr></thead>
            <tbody>
              {rows?.length === 0 && <tr><td style={cell} colSpan={6}>No privacy requests.</td></tr>}
              {rows?.map((r) => (
                <tr key={r.id} data-testid="privacy-row">
                  <td style={cell}>{r.contact_label ?? r.contact_id}{r.received_via === "client_app" ? " (client app)" : ""}{open === r.id && <RequestPanel r={r} onDone={() => void load()} />}</td>
                  <td style={cell}>{KIND[r.kind]}</td><td style={cell}>{when(r.requested_at)}</td><td style={cell}>{when(r.due_at)}</td>
                  <td style={cell}>{r.status}</td>
                  <td style={cell}><button type="button" style={quiet} onClick={() => setOpen(open === r.id ? null : r.id)}>{open === r.id ? "Close" : "Open"}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}
