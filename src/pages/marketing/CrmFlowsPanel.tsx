// BF_PORTAL_CRM_FLOWS_v1 (2026-11-24) - email flows for Boreal Financial and Keystone (BF-Server /api/crm/flows), the same
// as Boreal Risk Management's Flows: everyone gets a first email; opening or clicking picks the next one; a click makes a
// call task for the owner; a reply stops it. Flows are the one way to email a list. The business is passed in (X-Silo).
import { useEffect, useState, type CSSProperties } from "react";
import RichEmailEditor from "@/components/editor/RichEmailEditor";
import { api } from "@/api";
import { listStaffUsers } from "@/api/sharedShell";

type Silo = "BF" | "KS" | "SLF";
export type CrmFlow = {
  id: string; name: string; status: "draft" | "active" | "paused"; audience_tags: string[]; market: string; daily_new: number; new_today_limit?: number;
  owner_user_id: string | null; owner_name: string | null; from_name: string | null; from_email: string | null; reply_to: string | null;
  link_url: string | null; booking_url: string | null;
  people: number; waiting: number; emailed: number; not_opened: number; opened: number; clicked: number; stopped: number; emails_sent: number;
};
type FlowEmail = { key: string; label: string; subject: string; body: string; attachments?: string[] };
type Tag = { tag: string; people: number; emailable: number };
type Staff = { id: string; name: string };
type Collateral = { id: string; name: string };

const card: CSSProperties = { border: "1px solid var(--ui-border)", borderRadius: 10, padding: 16, background: "var(--ui-surface-strong)" };
const btn: CSSProperties = { padding: "6px 12px", borderRadius: 6, border: "1px solid var(--ui-border)", background: "var(--ui-surface)", color: "var(--ui-text)", fontSize: 13, cursor: "pointer" };
const primary: CSSProperties = { ...btn, background: "var(--accent, #1E3A8A)", borderColor: "var(--accent, #1E3A8A)", color: "#fff", fontWeight: 600 };
const input: CSSProperties = { width: "100%", padding: "7px 9px", borderRadius: 6, border: "1px solid var(--ui-border)", background: "var(--ui-surface)", color: "var(--ui-text)", fontSize: 13, marginTop: 4 };
const label: CSSProperties = { display: "block", fontSize: 12, color: "var(--ui-text-muted)" };
const STATUS: Record<string, string> = { draft: "Not started", active: "Running", paused: "Paused" };
const DEFAULTS: Record<Silo, { from_name: string; from_email: string; reply_to: string; link_url: string }> = {
  BF: { from_name: "Boreal Financial", from_email: "", reply_to: "", link_url: "https://boreal.financial" },
  SLF: { from_name: "Site Level Financial", from_email: "", reply_to: "", link_url: "" },
  KS: { from_name: "Todd at Keystone", from_email: "sales@keystonecrm.online", reply_to: "sales@keystonecrm.online", link_url: "https://keystonecrm.online" },
};
const failure = (e: unknown, fallback: string) => {
  const d = (e as { data?: { message?: string }; details?: { message?: string } }) ?? {};
  return d.data?.message || d.details?.message || fallback;
};
export function flowNumbers(f: CrmFlow): Array<[string, number]> {
  return [["People", f.people], ["Waiting to start", f.waiting], ["Emailed", f.emailed], ["Not opened yet", f.not_opened], ["Opened", f.opened], ["Clicked", f.clicked], ["Stopped", f.stopped]];
}

export default function CrmFlowsPanel({ silo }: { silo: Silo }) {
  const headers = { "X-Silo": silo };
  const call = <T,>(path: string, init: { method?: string; body?: string } = {}) => api<T>(`/api/crm/flows${path}`, { ...init, headers } as any);
  const [flows, setFlows] = useState<CrmFlow[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [collateral, setCollateral] = useState<Collateral[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [emails, setEmails] = useState<FlowEmail[]>([]);
  const [notAdded, setNotAdded] = useState(0);
  const [testTo, setTestTo] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null); // BF_PORTAL_FLOW_DELETE_RESTORE_v1
  const [deleted, setDeleted] = useState<{ id: string; name: string; people: number; deleted_at: string }[]>([]);
  const [draft, setDraft] = useState({ name: "", tags: [] as string[], market: "ALL", owner: "", ...DEFAULTS[silo], booking_url: "" });

  async function load() {
    try {
      const [l, t]: any[] = await Promise.all([call<any>(""), call<any>("/tags")]);
      setFlows(Array.isArray(l?.flows) ? l.flows : []);
      setTags(Array.isArray(t?.tags) ? t.tags : []);
      setError(null);
      call<any>("/deleted/list").then((d) => setDeleted(Array.isArray(d?.flows) ? d.flows : [])).catch(() => setDeleted([]));
    } catch (e) { setError(failure(e, "Could not load the flows.")); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    void load();
    listStaffUsers().then((u) => setStaff(u.map((x) => ({ id: x.id, name: [x.first_name, x.last_name].filter(Boolean).join(" ") || x.email || x.id })))).catch(() => setStaff([]));
    call<any>("/collateral").then((c) => setCollateral(Array.isArray(c?.items) ? c.items : [])).catch(() => setCollateral([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [silo]);

  async function run(key: string, fn: () => Promise<string | void>) {
    setBusy(key); setError(null); setNote(null);
    try { const said = await fn(); if (said) setNote(said); await load(); }
    catch (e) { setError(failure(e, "That did not work. Try again.")); }
    finally { setBusy(null); }
  }
  const create = () => run("create", async () => {
    if (!draft.name.trim()) throw { data: { message: "Give the flow a name." } };
    if (!draft.tags.length) throw { data: { message: "Pick at least one tag: the flow emails people with those tags." } };
    if (!draft.owner) throw { data: { message: "Pick who gets the call task when someone clicks." } };
    const who = staff.find((s) => s.id === draft.owner);
    await call<any>("", { method: "POST", body: JSON.stringify({ name: draft.name.trim(), audience_tags: draft.tags, market: draft.market, owner_user_id: draft.owner, owner_name: who?.name ?? "",
      from_name: draft.from_name, from_email: draft.from_email || undefined, reply_to: draft.reply_to || undefined, link_url: draft.link_url, booking_url: draft.booking_url || undefined }) });
    setDraft({ name: "", tags: [], market: "ALL", owner: "", ...DEFAULTS[silo], booking_url: "" });
    return "Flow created with starter wording. Open it, read the seven emails, send yourself a test, then add the people and start it.";
  });
  async function show(flow: CrmFlow) {
    if (open === flow.id) { setOpen(null); return; }
    setOpen(flow.id); setEmails([]);
    try { const r: any = await call<any>(`/${flow.id}`); setEmails(r?.emails ?? []); setNotAdded(Number(r?.not_yet_added ?? 0)); }
    catch (e) { setError(failure(e, "Could not open the flow.")); }
  }
  const saveEmails = (flow: CrmFlow) => run(`save:${flow.id}`, async () => {
    await call<any>(`/${flow.id}`, { method: "PATCH", body: JSON.stringify({ emails: Object.fromEntries(emails.map((e) => [e.key, { subject: e.subject, body: e.body, attachments: e.attachments ?? [] }])) }) });
    return "Emails saved.";
  });
  const addPeople = (flow: CrmFlow) => run(`add:${flow.id}`, async () => {
    const r: any = await call<any>(`/${flow.id}/audience`, { method: "POST", body: "{}" });
    setNotAdded(0);
    return `${r?.added ?? 0} people added.`;
  });
  const sendTest = (flow: CrmFlow) => run(`test:${flow.id}`, async () => {
    const r: any = await call<any>(`/${flow.id}/test`, { method: "POST", body: JSON.stringify({ to: testTo.trim() }) });
    return `${r?.sent ?? 0} test emails sent to ${testTo.trim()}.`;
  });
  const setStatus = (flow: CrmFlow, action: "start" | "pause" | "archive") => run(`${action}:${flow.id}`, async () => {
    await call<any>(`/${flow.id}/${action}`, { method: "POST", body: "{}" });
    setConfirmDelete(null);
    if (action === "archive") setOpen(null);
    return action === "start" ? `${flow.name} is running.` : action === "pause" ? `${flow.name} is paused.` : `${flow.name} is deleted. You can bring it back below.`;
  });
  const restore = (id: string, name: string) => run(`restore:${id}`, async () => {
    await call<any>(`/${id}/restore`, { method: "POST", body: "{}" });
    return `${name} is back, paused. Its emails and people are as they were.`;
  });
  const toggleTag = (t: string) => setDraft((d) => ({ ...d, tags: d.tags.includes(t) ? d.tags.filter((x) => x !== t) : [...d.tags, t] }));

  return (
    <div data-testid={`crm-flows-${silo}`} style={{ display: "grid", gap: 16, color: "var(--ui-text)" }}>
      <p style={{ margin: 0, fontSize: 13, color: "var(--ui-text-muted)", maxWidth: 820 }}>
        Everyone in a flow gets a first email. If they do not open it they get three more short ones, a week apart. If they open one, they get more detail two business days later.
        If they click a link, they get the booking link and the owner gets a call task. A reply stops their emails. Unsubscribes and bounces from any business are never emailed.
      </p>
      {error && <p role="alert" style={{ color: "#b91c1c", margin: 0, fontSize: 13 }}>{error}</p>}
      {note && <p style={{ color: "#047857", margin: 0, fontSize: 13 }}>{note}</p>}
      {loading && <p style={{ margin: 0, fontSize: 13, color: "var(--ui-text-muted)" }}>Loading...</p>}

      {flows.map((flow) => (
        <section key={flow.id} style={card} data-testid={`crm-flow-${flow.id}`}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
            <strong style={{ fontSize: 16 }}>{flow.name}</strong>
            <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 6, background: flow.status === "active" ? "#047857" : "var(--ui-surface)", color: flow.status === "active" ? "#fff" : "var(--ui-text-muted)", border: "1px solid var(--ui-border)" }}>{STATUS[flow.status] ?? flow.status}</span>
            <span style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>Tags: {(flow.audience_tags ?? []).join(", ") || "—"} · {flow.market === "ALL" ? "all countries" : flow.market} · call tasks to {flow.owner_name || "nobody"}{flow.status === "active" && flow.new_today_limit ? ` · up to ${flow.new_today_limit} new a day` : ""}</span>
            <span style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
              <button type="button" style={btn} onClick={() => void show(flow)}>{open === flow.id ? "Hide emails" : "Emails and people"}</button>
              {flow.status === "active"
                ? <button type="button" style={btn} disabled={busy !== null} onClick={() => void setStatus(flow, "pause")}>Pause</button>
                : <button type="button" style={primary} disabled={busy !== null || flow.people === 0} title={flow.people === 0 ? "Add the people first" : undefined} onClick={() => void setStatus(flow, "start")}>Start</button>}
            </span>
          </div>
          <dl style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 10, margin: "12px 0 0" }}>
            {flowNumbers(flow).map(([k, n]) => <div key={k}><dt style={{ fontSize: 11, color: "var(--ui-text-muted)" }}>{k}</dt><dd style={{ margin: 0, fontSize: 20 }}>{n.toLocaleString("en-CA")}</dd></div>)}
          </dl>
          {open === flow.id && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--ui-border)", display: "grid", gap: 12 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}>
                <button type="button" style={btn} disabled={busy !== null} onClick={() => void addPeople(flow)}>Add the people{notAdded ? ` (${notAdded.toLocaleString("en-CA")} not added yet)` : ""}</button>
                <label style={label}>Send all seven to
                  <input aria-label="Test email address" type="email" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="you@example.com" style={{ ...input, width: 240 }} />
                </label>
                <button type="button" style={btn} disabled={busy !== null || !testTo.trim()} onClick={() => void sendTest(flow)}>Send test</button>
                {flow.status !== "active" && (confirmDelete === flow.id
                  ? <span style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center", fontSize: 13 }}>Delete {flow.name}?
                      <button type="button" style={{ ...btn, color: "#fff", background: "#b91c1c", borderColor: "#b91c1c" }} disabled={busy !== null} onClick={() => void setStatus(flow, "archive")}>Yes, delete</button>
                      <button type="button" style={btn} onClick={() => setConfirmDelete(null)}>Keep it</button></span>
                  : <button type="button" style={{ ...btn, marginLeft: "auto", color: "#b91c1c" }} disabled={busy !== null} onClick={() => setConfirmDelete(flow.id)}>Delete flow</button>)}
              </div>
              {emails.map((e, i) => (
                <div key={e.key} style={{ border: "1px solid var(--ui-border)", borderRadius: 8, padding: 12 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{e.label}</div>
                  <label style={{ ...label, marginTop: 8 }}>Subject
                    <input aria-label={`${e.label} subject`} value={e.subject} onChange={(ev) => setEmails((all) => all.map((x, j) => (j === i ? { ...x, subject: ev.target.value } : x)))} style={input} />
                  </label>
                  <div style={{ marginTop: 8 }}>
                    <RichEmailEditor
                      ariaLabel={`${e.label} message`}
                      docKey={`${flow.id}-${e.key}`}
                      value={e.body}
                      onChange={(html) => setEmails((all) => all.map((x, j) => (j === i ? { ...x, body: html } : x)))}
                      meetingButtonHtml={'<p><a href="{{booking_link}}" style="display:inline-block;padding:10px 18px;background:#0B1F3A;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600">Book a call</a></p>'}
                      note="Merge fields: {{first_name}}, {{company}}, {{link}} (the flow's page), {{booking_link}} (the owner's calendar)."
                    />
                  </div>
                  {collateral.length > 0 && (
                    <fieldset style={{ marginTop: 8, fontSize: 12, border: 0, padding: 0 }}>
                      <legend style={{ marginBottom: 4, color: "var(--ui-text-muted)" }}>Attach PDFs (up to 3)</legend>
                      {collateral.map((c) => {
                        const on = (e.attachments ?? []).includes(c.id);
                        return <label key={c.id} style={{ marginRight: 14, display: "inline-flex", gap: 4, alignItems: "center" }}>
                          <input type="checkbox" checked={on} disabled={!on && (e.attachments ?? []).length >= 3}
                            onChange={() => setEmails((all) => all.map((x, j) => (j === i ? { ...x, attachments: on ? (x.attachments ?? []).filter((id) => id !== c.id) : [...(x.attachments ?? []), c.id] } : x)))} />
                          {c.name}
                        </label>;
                      })}
                    </fieldset>
                  )}
                </div>
              ))}
              {emails.length > 0 && <div><button type="button" style={primary} disabled={busy !== null} onClick={() => void saveEmails(flow)}>Save emails</button></div>}
            </div>
          )}
        </section>
      ))}

      <section style={{ ...card, borderStyle: "dashed" }} data-testid="crm-flow-new">
        <strong style={{ fontSize: 15 }}>New flow</strong>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 10 }}>
          <label style={label}>Name<input aria-label="Flow name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder={silo === "KS" ? "Brokers - Canada" : "Past clients"} style={input} /></label>
          <label style={label}>Country<select aria-label="Country" value={draft.market} onChange={(e) => setDraft({ ...draft, market: e.target.value })} style={input}><option value="ALL">All</option><option value="CA">Canada</option><option value="US">United States</option></select></label>
          <label style={label}>Call tasks go to<select aria-label="Call task owner" value={draft.owner} onChange={(e) => setDraft({ ...draft, owner: e.target.value })} style={input}><option value="">Pick a person</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
          <label style={label}>From name<input aria-label="From name" value={draft.from_name} onChange={(e) => setDraft({ ...draft, from_name: e.target.value })} style={input} /></label>
          <label style={label}>From address<input aria-label="From address" value={draft.from_email} onChange={(e) => setDraft({ ...draft, from_email: e.target.value })} placeholder="default sender" style={input} /></label>
          <label style={label}>Replies go to (a reply stops their emails)<input aria-label="Reply-to" value={draft.reply_to} onChange={(e) => setDraft({ ...draft, reply_to: e.target.value })} style={input} /></label>
          <label style={label}>Link ({"{{link}}"})<input aria-label="Link" value={draft.link_url} onChange={(e) => setDraft({ ...draft, link_url: e.target.value })} style={input} /></label>
          <label style={label}>Booking link ({"{{booking_link}}"})<input aria-label="Booking link" value={draft.booking_url} onChange={(e) => setDraft({ ...draft, booking_url: e.target.value })} style={input} /></label>
        </div>
        <div style={{ marginTop: 12 }}>
          <div style={label}>Who it emails: people with any of these tags</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6, maxHeight: 160, overflowY: "auto" }}>
            {tags.map((t) => {
              const on = draft.tags.includes(t.tag);
              return <button key={t.tag} type="button" onClick={() => toggleTag(t.tag)} aria-pressed={on}
                style={{ ...btn, padding: "3px 9px", fontSize: 12, background: on ? "var(--accent, #1E3A8A)" : "var(--ui-surface)", color: on ? "#fff" : "var(--ui-text)" }}>
                {t.tag} ({t.emailable.toLocaleString("en-CA")})
              </button>;
            })}
            {!tags.length && <span style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>No tags in this CRM yet.</span>}
          </div>
        </div>
        <div style={{ marginTop: 12 }}><button type="button" style={primary} disabled={busy !== null} onClick={() => void create()}>Create flow</button></div>
      </section>

      {deleted.length > 0 && (
        <section style={card} data-testid="crm-flows-deleted">
          <strong style={{ fontSize: 15 }}>Deleted flows</strong>
          <p style={{ margin: "4px 0 10px", fontSize: 13, color: "var(--ui-text-muted)" }}>A deleted flow keeps its emails and people. Bring it back and it comes back paused.</p>
          {deleted.map((d) => (
            <div key={d.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "6px 0", borderTop: "1px solid var(--ui-border)", fontSize: 13 }}>
              <span>{d.name}</span>
              <span style={{ color: "var(--ui-text-muted)" }}>{d.people.toLocaleString("en-CA")} people · deleted {new Date(d.deleted_at).toLocaleDateString("en-CA")}</span>
              <button type="button" style={{ ...btn, marginLeft: "auto" }} disabled={busy !== null} onClick={() => void restore(d.id, d.name)}>Bring back</button>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
