// BF_PORTAL_BI_FIELD_REPS_v1 - outside reps who collect contacts at events (BI-Server /api/v1/bi/field-reps).
// Staff add a rep here and send them their page link and PIN. Each rep's contacts, and what happened to the
// information email, are listed under the rep.
import { useEffect, useState } from "react";
import { api } from "@/api";

type Rep = { id: string; code: string; full_name: string; company_name: string | null; email: string | null; phone_e164: string | null; active: boolean; contacts?: number; opened?: number; last_contact_at?: string | null; page_url?: string; share_url?: string };
type Contact = { id: string; full_name: string | null; company_name: string | null; title: string | null; email: string | null; phone_e164: string | null; source: string; status: string; created_at: string; notes: string | null };
type Issued = { name: string; page_url: string; pin: string };
const EMPTY = { full_name: "", company_name: "", email: "", phone: "" };
const INPUT = "mt-1 w-full rounded border border-card bg-brand-bg px-3 py-2 text-sm text-white";
const BTN = "rounded border border-card px-3 py-1 text-sm text-white/80 hover:text-white disabled:opacity-50";
export const SOURCE_LABEL: Record<string, string> = { card: "Business card", manual: "Typed in", qr: "QR code or link" };
const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" }) : "-");
const failure = (e: unknown, fallback: string) => { const d = (e as { data?: { message?: string }; message?: string }) ?? {}; return d.data?.message || d.message || fallback; };

export default function BIFieldReps() {
  const [reps, setReps] = useState<Rep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [issued, setIssued] = useState<Issued | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Contact[] | null>(null);

  async function load() {
    setLoading(true);
    try { const r: any = await api<any>("/api/v1/bi/field-reps"); setReps(Array.isArray(r?.reps) ? r.reps : []); setError(null); }
    catch (e) { setError(failure(e, "Could not load the reps.")); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  async function add(ev: React.FormEvent) {
    ev.preventDefault();
    if (!form.full_name.trim()) { setError("Enter the rep's name."); return; }
    setSaving(true); setError(null);
    try {
      const r: any = await api<any>("/api/v1/bi/field-reps", { method: "POST", body: JSON.stringify(form) });
      setIssued({ name: r.rep.full_name, page_url: r.page_url, pin: r.pin });
      setForm(EMPTY);
      void load();
    } catch (e) { setError(failure(e, "Could not add the rep.")); }
    finally { setSaving(false); }
  }
  async function newPin(rep: Rep) {
    try { const r: any = await api<any>(`/api/v1/bi/field-reps/${rep.id}/pin`, { method: "POST", body: "{}" }); setIssued({ name: rep.full_name, page_url: r.page_url, pin: r.pin }); }
    catch (e) { setError(failure(e, "Could not make a new PIN.")); }
  }
  async function setActive(rep: Rep, active: boolean) {
    try { await api<any>(`/api/v1/bi/field-reps/${rep.id}`, { method: "PATCH", body: JSON.stringify({ active }) }); void load(); }
    catch (e) { setError(failure(e, "Could not change that.")); }
  }
  async function show(rep: Rep) {
    if (open === rep.id) { setOpen(null); return; }
    setOpen(rep.id); setContacts(null);
    try { const r: any = await api<any>(`/api/v1/bi/field-reps/${rep.id}/contacts`); setContacts(Array.isArray(r?.contacts) ? r.contacts : []); }
    catch { setContacts([]); }
  }
  const copy = (text: string) => { void navigator.clipboard?.writeText(text).catch(() => undefined); };

  return (
    <div className="text-white" data-testid="bi-field-reps">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-3xl font-semibold">Reps</h2>
        <button onClick={() => void load()} className={BTN}>Refresh</button>
      </div>
      <p className="mb-6 max-w-3xl text-sm text-white/70">Outside reps who collect contacts at events. Each rep gets a private page with their QR code, a business card scanner and a list of who they have added. Everyone they add is tagged with their code in the CRM, so they get the credit when a deal comes in.</p>

      {error ? <div role="alert" className="mb-4 rounded border border-amber-500/40 bg-amber-500/10 p-3 text-sm">{error}</div> : null}

      {issued ? (
        <div role="status" className="mb-6 rounded border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm" data-testid="rep-issued">
          <p className="font-semibold">Send these to {issued.name}. The PIN is shown once.</p>
          <p className="mt-2">Page: <span className="font-mono">{issued.page_url}</span> <button className={BTN} onClick={() => copy(issued.page_url)}>Copy link</button></p>
          <p className="mt-2">PIN: <span className="font-mono text-lg">{issued.pin}</span> <button className={BTN} onClick={() => copy(issued.pin)}>Copy PIN</button></p>
          <button className={`${BTN} mt-3`} onClick={() => setIssued(null)}>Done</button>
        </div>
      ) : null}

      <form onSubmit={add} className="mb-8 grid gap-3 rounded border border-card bg-brand-surface p-4 md:grid-cols-5" aria-label="Add a rep">
        <label className="text-sm">Name<input className={INPUT} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></label>
        <label className="text-sm">Company<input className={INPUT} value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} /></label>
        <label className="text-sm">Email<input className={INPUT} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        <label className="text-sm">Mobile<input className={INPUT} type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
        <div className="flex items-end"><button type="submit" disabled={saving} className="w-full rounded bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Adding..." : "Add rep"}</button></div>
      </form>

      {loading ? <p className="text-sm text-white/70">Loading...</p> : reps.length === 0 ? <p className="text-sm text-white/70">No reps yet. Add the first one above.</p> : (
        <div className="overflow-x-auto rounded border border-card">
          <table className="w-full text-left text-sm">
            <thead className="bg-brand-surface text-white/70"><tr><th className="px-3 py-2">Rep</th><th className="px-3 py-2">Code</th><th className="px-3 py-2">Contacts</th><th className="px-3 py-2">Opened</th><th className="px-3 py-2">Last contact</th><th className="px-3 py-2">Status</th><th className="px-3 py-2" /></tr></thead>
            <tbody>
              {reps.map((r) => (
                <FragmentRow key={r.id} rep={r} open={open === r.id} contacts={open === r.id ? contacts : null}
                  onShow={() => void show(r)} onPin={() => void newPin(r)} onActive={() => void setActive(r, !r.active)} onCopy={() => copy(r.page_url || "")} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FragmentRow({ rep, open, contacts, onShow, onPin, onActive, onCopy }: { rep: Rep; open: boolean; contacts: Contact[] | null; onShow: () => void; onPin: () => void; onActive: () => void; onCopy: () => void }) {
  return (
    <>
      <tr className="border-t border-card">
        <td className="px-3 py-2"><div className="font-semibold">{rep.full_name}</div><div className="text-white/60">{[rep.company_name, rep.email].filter(Boolean).join(" | ")}</div></td>
        <td className="px-3 py-2 font-mono">{rep.code}</td>
        <td className="px-3 py-2">{rep.contacts ?? 0}</td>
        <td className="px-3 py-2">{rep.opened ?? 0}</td>
        <td className="px-3 py-2">{when(rep.last_contact_at)}</td>
        <td className="px-3 py-2">{rep.active ? "On" : "Off"}</td>
        <td className="px-3 py-2"><div className="flex flex-wrap justify-end gap-2">
          <button className={BTN} onClick={onShow}>{open ? "Hide contacts" : "Contacts"}</button>
          <button className={BTN} onClick={onCopy}>Copy page link</button>
          <button className={BTN} onClick={onPin}>New PIN</button>
          <button className={BTN} onClick={onActive}>{rep.active ? "Switch off" : "Switch on"}</button>
        </div></td>
      </tr>
      {open ? (
        <tr className="border-t border-card bg-brand-surface/50"><td colSpan={7} className="px-3 py-3">
          {contacts === null ? <p className="text-white/70">Loading...</p> : contacts.length === 0 ? <p className="text-white/70">No contacts yet.</p> : (
            <ul className="grid gap-2">
              {contacts.map((c) => (
                <li key={c.id} className="rounded border border-card px-3 py-2">
                  <span className="font-semibold">{c.full_name || c.email || c.phone_e164}</span>
                  <span className="text-white/70">{[c.title, c.company_name].filter(Boolean).length ? " - " + [c.title, c.company_name].filter(Boolean).join(", ") : ""}</span>
                  <div className="text-white/70">{[c.email, c.phone_e164, SOURCE_LABEL[c.source] ?? c.source, when(c.created_at)].filter(Boolean).join(" | ")}</div>
                  <div className="text-emerald-300">{c.status}</div>
                  {c.notes ? <div className="text-white/70">Note: {c.notes}</div> : null}
                </li>
              ))}
            </ul>
          )}
        </td></tr>
      ) : null}
    </>
  );
}
