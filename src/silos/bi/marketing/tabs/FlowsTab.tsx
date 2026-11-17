// BF_PORTAL_BI_EMAIL_FLOWS_v1 - email flows on the Insurance side (BI-Server /api/v1/bi/flows).
// A flow sends everyone a first email; whether each person opens or clicks decides the next one. Staff create a flow
// from a ready-made one, read and change the seven emails, send themselves a test, add the people and start it.
import { useEffect, useState } from "react";
import { api } from "@/api";
import { listStaffUsers } from "@/api/sharedShell";

export type Flow = {
  id: string; name: string; preset: string | null; status: "draft" | "active" | "paused"; daily_new: number; new_today_limit?: number;
  owner_user_id: string | null; owner_name: string | null; from_name: string | null; reply_to: string | null;
  people: number; waiting: number; emailed: number; not_opened: number; opened: number; clicked: number; stopped: number; emails_sent: number;
};
type Preset = { key: string; name: string };
type FlowEmail = { key: string; label: string; subject: string; body: string };
type Staff = { id: string; name: string };

const BTN = "rounded border border-card px-3 py-1 text-sm text-white/80 hover:text-white disabled:opacity-50";
const PRIMARY = "rounded bg-emerald-600 px-3 py-1 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50";
const INPUT = "mt-1 w-full rounded border border-card bg-brand-bg px-3 py-2 text-sm text-white";
export const STATUS_LABEL: Record<string, string> = { draft: "Not started", active: "Running", paused: "Paused" };
const failure = (e: unknown, fallback: string) => { const d = (e as { data?: { message?: string }; details?: { message?: string }; message?: string }) ?? {}; return d.data?.message || d.details?.message || fallback; };
/** The numbers shown on a flow, in the order people ask about them. */
export function flowNumbers(f: Flow): Array<[string, number]> {
  return [["People", f.people], ["Waiting to start", f.waiting], ["Emailed", f.emailed], ["Not opened yet", f.not_opened], ["Opened", f.opened], ["Clicked", f.clicked], ["Stopped", f.stopped]];
}
const DEFAULT_REPLY_TO = "andrew.p@boreal.financial";

export default function FlowsTab() {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [owner, setOwner] = useState("");
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [emails, setEmails] = useState<FlowEmail[]>([]);
  const [notAdded, setNotAdded] = useState(0);
  const [testTo, setTestTo] = useState("");

  async function load() {
    try {
      const [l, p]: any[] = await Promise.all([api<any>("/api/v1/bi/flows"), api<any>("/api/v1/bi/flows/presets")]);
      setFlows(Array.isArray(l?.flows) ? l.flows : []);
      setPresets(Array.isArray(p?.presets) ? p.presets : []);
      setError(null);
    } catch (e) { setError(failure(e, "Could not load the flows.")); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    void load();
    listStaffUsers().then((users) => setStaff(users.map((u) => ({ id: u.id, name: [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email || u.id })))).catch(() => setStaff([]));
  }, []);

  async function run(key: string, fn: () => Promise<string | void>) {
    setBusy(key); setError(null); setNote(null);
    try { const said = await fn(); if (said) setNote(said); await load(); }
    catch (e) { setError(failure(e, "That did not work. Try again.")); }
    finally { setBusy(null); }
  }
  const create = (preset: Preset) => run(`new:${preset.key}`, async () => {
    if (!owner) throw { message: "", data: { message: "Pick who gets the call task when someone clicks." } };
    const who = staff.find((s) => s.id === owner);
    await api<any>("/api/v1/bi/flows", { method: "POST", body: JSON.stringify({ preset: preset.key, owner_user_id: owner, owner_name: who?.name ?? "", reply_to: DEFAULT_REPLY_TO }) });
    return `${preset.name} created. Read the emails, send yourself a test, then add the people and start it.`;
  });
  async function show(flow: Flow) {
    if (open === flow.id) { setOpen(null); return; }
    setOpen(flow.id); setEmails([]);
    try { const r: any = await api<any>(`/api/v1/bi/flows/${flow.id}`); setEmails(r?.emails ?? []); setNotAdded(Number(r?.not_yet_added ?? 0)); }
    catch (e) { setError(failure(e, "Could not open the flow.")); }
  }
  const saveEmails = (flow: Flow) => run(`save:${flow.id}`, async () => {
    await api<any>(`/api/v1/bi/flows/${flow.id}`, { method: "PATCH", body: JSON.stringify({ emails: Object.fromEntries(emails.map((e) => [e.key, { subject: e.subject, body: e.body }])) }) });
    return "Emails saved.";
  });
  const addPeople = (flow: Flow) => run(`add:${flow.id}`, async () => {
    const r: any = await api<any>(`/api/v1/bi/flows/${flow.id}/audience`, { method: "POST", body: "{}" });
    setNotAdded(0);
    return `${r?.added ?? 0} people added.`;
  });
  const sendTest = (flow: Flow) => run(`test:${flow.id}`, async () => {
    const r: any = await api<any>(`/api/v1/bi/flows/${flow.id}/test`, { method: "POST", body: JSON.stringify({ to: testTo.trim() }) });
    return `${r?.sent ?? 0} test emails sent to ${testTo.trim()}.`;
  });
  const setStatus = (flow: Flow, action: "start" | "pause") => run(`${action}:${flow.id}`, async () => {
    await api<any>(`/api/v1/bi/flows/${flow.id}/${action}`, { method: "POST", body: "{}" });
    return action === "start" ? `${flow.name} is running.` : `${flow.name} is paused. Nothing more is sent until you start it again.`;
  });

  const missing = presets.filter((p) => !flows.some((f) => f.preset === p.key));
  return <div data-testid="bi-flows" className="space-y-6">
    <p className="max-w-3xl text-sm text-white/70">
      Everyone in a flow gets a first email. If they do not open it they get three more short ones, a week apart. If they open one, they get more detail two business days later.
      If they click a link, they get the booking link and a call task is created.
    </p>
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    {note && <p className="text-sm text-emerald-300">{note}</p>}
    {loading ? <p className="text-sm text-white/60">Loading...</p> : null}

    {flows.map((flow) => <section key={flow.id} data-testid={`flow-${flow.preset ?? flow.id}`} className="rounded-lg border border-card p-4">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-lg font-medium text-white">{flow.name}</h3>
        <span className={"rounded px-2 py-0.5 text-xs " + (flow.status === "active" ? "bg-emerald-700 text-white" : "bg-white/10 text-white/80")}>{STATUS_LABEL[flow.status] ?? flow.status}</span>
        <span className="text-xs text-white/60">Call tasks go to {flow.owner_name || "nobody yet"}{flow.status === "active" && flow.new_today_limit ? ` · up to ${flow.new_today_limit} new people a day` : ""}</span>
        <span className="ml-auto flex gap-2">
          <button type="button" className={BTN} onClick={() => void show(flow)}>{open === flow.id ? "Close" : "Emails and people"}</button>
          {flow.status === "active"
            ? <button type="button" className={BTN} disabled={busy !== null} onClick={() => void setStatus(flow, "pause")}>Pause</button>
            : <button type="button" className={PRIMARY} disabled={busy !== null || flow.people === 0} title={flow.people === 0 ? "Add the people first" : undefined} onClick={() => void setStatus(flow, "start")}>Start</button>}
        </span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {flowNumbers(flow).map(([label, n]) => <div key={label}><dt className="text-xs text-white/60">{label}</dt><dd className="text-xl text-white">{n.toLocaleString("en-CA")}</dd></div>)}
      </dl>
      {open === flow.id && <div className="mt-4 space-y-4 border-t border-card pt-4">
        <div className="flex flex-wrap items-end gap-3">
          <button type="button" className={BTN} disabled={busy !== null} onClick={() => void addPeople(flow)}>Add the people{notAdded ? ` (${notAdded.toLocaleString("en-CA")} not added yet)` : ""}</button>
          <label className="text-sm text-white/80">Send all seven to
            <input aria-label="Test email address" type="email" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="you@example.com" className={INPUT + " w-64"} />
          </label>
          <button type="button" className={BTN} disabled={busy !== null || !testTo.trim()} onClick={() => void sendTest(flow)}>Send test</button>
        </div>
        {emails.map((e, i) => <div key={e.key} className="rounded border border-card p-3">
          <p className="text-sm font-medium text-white">{e.label}</p>
          <label className="mt-2 block text-xs text-white/70">Subject
            <input aria-label={`${e.label} subject`} value={e.subject} onChange={(ev) => setEmails((all) => all.map((x, j) => (j === i ? { ...x, subject: ev.target.value } : x)))} className={INPUT} />
          </label>
          <div className="mt-2 grid gap-3 lg:grid-cols-2">
            <label className="block text-xs text-white/70">Message
              <textarea aria-label={`${e.label} message`} rows={9} value={e.body} onChange={(ev) => setEmails((all) => all.map((x, j) => (j === i ? { ...x, body: ev.target.value } : x)))} className={INPUT + " font-mono text-xs"} />
            </label>
            <div>
              <p className="text-xs text-white/70">How it reads</p>
              <iframe title={`${e.label} preview`} sandbox="" srcDoc={`<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5">${e.body}</div>`} className="mt-1 h-56 w-full rounded border border-card bg-white" />
            </div>
          </div>
        </div>)}
        {emails.length > 0 && <button type="button" className={PRIMARY} disabled={busy !== null} onClick={() => void saveEmails(flow)}>Save emails</button>}
      </div>}
    </section>)}

    {missing.length > 0 && <section className="rounded-lg border border-dashed border-card p-4">
      <h3 className="text-base font-medium text-white">Set up a flow</h3>
      <label className="mt-2 block max-w-sm text-sm text-white/80">Who gets the call task when someone clicks
        <select aria-label="Call task owner" value={owner} onChange={(e) => setOwner(e.target.value)} className={INPUT}>
          <option value="" className="text-black">Pick a person</option>
          {staff.map((s) => <option key={s.id} value={s.id} className="text-black">{s.name}</option>)}
        </select>
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        {missing.map((p) => <button key={p.key} type="button" className={BTN} disabled={busy !== null} onClick={() => void create(p)}>{p.name}</button>)}
      </div>
    </section>}
  </div>;
}
