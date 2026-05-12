// BF_PORTAL_BLOCK_v199_LENDER_USERS_v1
// Staff lender management with click-to-detail drawer. The drawer
// surfaces a Contacts panel listing every bi_lender_contacts row for
// the lender and lets staff add / edit / deactivate them + resend the
// invite SMS. Each contact is a person at the lender who can OTP-login
// to the BI-Website /lender portal.
import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { api } from "@/api";

type Lender = {
  id: string;
  company_name: string;
  website_url?: string | null;
  address_line1?: string | null;
  city?: string | null;
  province?: string | null;
  postal_code?: string | null;
  country: string;
  contact_full_name?: string | null;
  contact_email?: string | null;
  contact_phone_e164?: string | null;
  is_active: boolean;
  live_keys_enabled?: boolean | null;
};

type Contact = {
  id: string;
  lender_id: string;
  full_name: string;
  email: string | null;
  phone_e164: string | null;
  role: string | null;
  is_primary: boolean;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
};

const emptyLender = {
  company_name: "", website_url: "", address_line1: "", city: "", province: "",
  postal_code: "", country: "CA",
  contact_full_name: "", contact_email: "", contact_phone_e164: "",
};

const emptyContact = { full_name: "", email: "", phone_e164: "", role: "" };

export default function BILenderManagement() {
  const [lenders, setLenders] = useState<Lender[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ ...emptyLender });
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api<{ lenders: Lender[] }>("/api/v1/bi/admin/lenders");
      setLenders(r.lenders || []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load lenders");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function create() {
    setSaving(true);
    try {
      await api("/api/v1/bi/admin/lenders", { method: "POST", body: JSON.stringify(form) });
      toast.success("Lender created — invite SMS sent");
      setForm({ ...emptyLender }); setShowCreate(false);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Create failed");
    } finally { setSaving(false); }
  }

  async function deactivate(id: string) {
    if (!confirm("Deactivate this lender? All API keys will be revoked and contacts lose login access.")) return;
    await api(`/api/v1/bi/admin/lenders/${id}`, { method: "DELETE" });
    toast.success("Deactivated");
    await load();
  }

  async function approveLiveKeys(id: string, enabled: boolean) {
    const msg = enabled
      ? "Approve LIVE API key access? The lender will be SMS'd and can mint bk_live_* keys that hit the real carrier."
      : "Revoke LIVE API key access? Existing live keys keep working until manually revoked; only further minting is blocked.";
    if (!confirm(msg)) return;
    try {
      await api(`/api/v1/bi/admin/lenders/${id}/approve-live-keys`, { method: "POST", body: JSON.stringify({ enabled }) });
      toast.success(enabled ? "Live keys approved + SMS sent" : "Live keys revoked");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  const selected = lenders.find((l) => l.id === selectedId) ?? null;

  return (
    <div className="text-white">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="text-3xl font-semibold">Lender Management</h2>
        <button
          className="bg-brand-accent hover:bg-brand-accentHover text-white rounded-full h-11 px-6 font-medium"
          onClick={() => setShowCreate(true)}
        >
          + Create Lender
        </button>
      </div>

      <div className="rounded-xl border border-card bg-brand-surface overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-left text-white/60">
            <tr>
              <th className="px-4 py-2">Company</th>
              <th className="px-4 py-2">Primary contact</th>
              <th className="px-4 py-2">Phone</th>
              <th className="px-4 py-2">Country</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Live keys</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="p-4 text-white/40" colSpan={6}>Loading…</td></tr>
            ) : lenders.length === 0 ? (
              <tr><td className="p-4 text-white/40" colSpan={6}>No lenders yet.</td></tr>
            ) : lenders.map((l) => (
              <tr
                key={l.id}
                onClick={() => setSelectedId(l.id)}
                className={`border-t border-white/5 cursor-pointer hover:bg-white/5 ${selectedId === l.id ? "bg-white/5" : ""}`}
              >
                <td className="px-4 py-3">
                  <div className="font-medium">{l.company_name}</div>
                  {l.website_url ? (
                    <a href={l.website_url} className="text-xs text-blue-300" target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                      {l.website_url}
                    </a>
                  ) : null}
                </td>
                <td className="px-4 py-3">{l.contact_full_name || <span className="text-white/30">—</span>}</td>
                <td className="px-4 py-3 font-mono text-xs">{l.contact_phone_e164 || "—"}</td>
                <td className="px-4 py-3">{l.country}</td>
                <td className="px-4 py-3">
                  {l.is_active ? <span className="text-emerald-300">Active</span> : <span className="text-white/40">Inactive</span>}
                </td>
                <td className="px-4 py-3">
                  {l.live_keys_enabled === true ? (
                    <span className="text-emerald-300 text-xs">Enabled</span>
                  ) : (
                    <span className="text-amber-300/60 text-xs">Test only</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate ? (
        <CreateLenderModal
          form={form}
          setForm={setForm}
          saving={saving}
          onSave={create}
          onClose={() => setShowCreate(false)}
        />
      ) : null}

      {selected ? (
        <LenderDetailDrawer
          lender={selected}
          onClose={() => setSelectedId(null)}
          onMutated={load}
          onDeactivate={() => deactivate(selected.id)}
          onApproveLiveKeys={(enabled) => approveLiveKeys(selected.id, enabled)}
        />
      ) : null}
    </div>
  );
}

// =====================================================================
// Create Lender modal (unchanged behavior, restyled for parity)
// =====================================================================
function CreateLenderModal(props: {
  form: typeof emptyLender;
  setForm: (f: typeof emptyLender) => void;
  saving: boolean;
  onSave: () => void;
  onClose: () => void;
}) {
  const { form, setForm } = props;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-[#112A4D] p-6">
        <h3 className="mb-4 text-xl font-semibold">Create Lender</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <Input label="Company name *" value={form.company_name} onChange={(v) => setForm({ ...form, company_name: v })} />
          <Input label="Website URL" value={form.website_url} onChange={(v) => setForm({ ...form, website_url: v })} />
          <Input label="Address line 1" value={form.address_line1} onChange={(v) => setForm({ ...form, address_line1: v })} containerClass="md:col-span-2" />
          <Input label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
          <Input label="Province / State" value={form.province} onChange={(v) => setForm({ ...form, province: v })} />
          <Input label="Postal / Zip" value={form.postal_code} onChange={(v) => setForm({ ...form, postal_code: v })} />
          <div>
            <label className="mb-1 block text-sm">Country *</label>
            <select className="w-full rounded p-2 text-black" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}>
              <option value="CA">Canada</option>
              <option value="US">United States</option>
            </select>
          </div>
          <div className="md:col-span-2 mt-2 border-t border-white/10 pt-3 text-sm font-semibold">Primary contact (receives invite SMS for OTP login)</div>
          <Input label="Contact full name *" value={form.contact_full_name} onChange={(v) => setForm({ ...form, contact_full_name: v })} />
          <Input label="Contact mobile (E.164) *" value={form.contact_phone_e164} onChange={(v) => setForm({ ...form, contact_phone_e164: v })} placeholder="+15875551234" />
          <Input label="Contact email *" value={form.contact_email} onChange={(v) => setForm({ ...form, contact_email: v })} type="email" containerClass="md:col-span-2" />
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button className="rounded border border-white/20 px-4 py-2" onClick={props.onClose} disabled={props.saving}>Cancel</button>
          <button className="rounded bg-brand-accent px-4 py-2 font-medium disabled:opacity-50" onClick={props.onSave} disabled={props.saving}>
            {props.saving ? "Saving…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// Lender detail drawer — Details + Contacts panel
// =====================================================================
function LenderDetailDrawer(props: {
  lender: Lender;
  onClose: () => void;
  onMutated: () => void | Promise<void>;
  onDeactivate: () => void;
  onApproveLiveKeys: (enabled: boolean) => void;
}) {
  const { lender } = props;
  const [tab, setTab] = useState<"details" | "contacts">("details");
  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/40">
      <div className="w-full max-w-3xl overflow-y-auto bg-brand-surface border-l border-card p-6">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-white/60">Lender</div>
            <h3 className="text-2xl font-semibold">{lender.company_name}</h3>
            <div className="mt-1 text-xs text-white/50">
              {lender.country}
              {lender.contact_phone_e164 ? <> · {lender.contact_phone_e164}</> : null}
              {" · "}
              {lender.is_active ? <span className="text-emerald-300">Active</span> : <span className="text-white/40">Inactive</span>}
              {lender.live_keys_enabled === true ? <> · <span className="text-emerald-300">Live keys</span></> : null}
            </div>
          </div>
          <button onClick={props.onClose} className="text-white/60 hover:text-white">✕</button>
        </div>

        <nav className="mb-4 flex gap-1 border-b border-white/10">
          {([
            { key: "details", label: "Details" },
            { key: "contacts", label: "Contacts" },
          ] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm transition ${tab === t.key ? "border-b-2 border-blue-400 text-white" : "text-white/60 hover:text-white"}`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {tab === "details" ? (
          <DetailsPanel
            lender={lender}
            onDeactivate={props.onDeactivate}
            onApproveLiveKeys={props.onApproveLiveKeys}
          />
        ) : (
          <ContactsPanel lender={lender} onMutated={props.onMutated} />
        )}
      </div>
    </div>
  );
}

function DetailsPanel(props: {
  lender: Lender;
  onDeactivate: () => void;
  onApproveLiveKeys: (enabled: boolean) => void;
}) {
  const { lender } = props;
  return (
    <div className="space-y-4 text-sm">
      <Row k="Company name" v={lender.company_name} />
      <Row k="Website" v={lender.website_url || "—"} />
      <Row k="Address" v={[lender.address_line1, lender.city, lender.province, lender.postal_code].filter(Boolean).join(", ") || "—"} />
      <Row k="Country" v={lender.country} />
      <div className="border-t border-white/10 pt-4">
        <div className="text-xs uppercase tracking-widest text-white/60 mb-2">Primary contact</div>
        <Row k="Name" v={lender.contact_full_name || "—"} />
        <Row k="Phone" v={lender.contact_phone_e164 || "—"} mono />
        <Row k="Email" v={lender.contact_email || "—"} />
      </div>
      <div className="border-t border-white/10 pt-4 flex flex-wrap gap-2">
        {lender.live_keys_enabled === true ? (
          <button
            onClick={() => props.onApproveLiveKeys(false)}
            className="rounded border border-red-500/40 text-red-200 px-3 py-1.5 text-sm hover:bg-red-500/10"
          >
            Revoke live keys
          </button>
        ) : (
          <button
            onClick={() => props.onApproveLiveKeys(true)}
            className="rounded border border-emerald-500/40 text-emerald-200 px-3 py-1.5 text-sm hover:bg-emerald-500/10"
          >
            Approve live keys
          </button>
        )}
        {lender.is_active ? (
          <button
            onClick={props.onDeactivate}
            className="rounded border border-red-500/40 text-red-200 px-3 py-1.5 text-sm hover:bg-red-500/10"
          >
            Deactivate lender
          </button>
        ) : null}
      </div>
    </div>
  );
}

function ContactsPanel(props: { lender: Lender; onMutated: () => void | Promise<void> }) {
  const { lender } = props;
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState({ ...emptyContact });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api<{ contacts: Contact[] }>(`/api/v1/bi/admin/lenders/${lender.id}/contacts`);
      setContacts(r.contacts || []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load contacts");
    } finally { setLoading(false); }
  }, [lender.id]);

  useEffect(() => { void load(); }, [load]);

  async function add() {
    if (!draft.full_name.trim() || !draft.phone_e164.trim()) {
      toast.error("Name + phone required");
      return;
    }
    setSaving(true);
    try {
      await api(`/api/v1/bi/admin/lenders/${lender.id}/contacts`, {
        method: "POST",
        body: JSON.stringify(draft),
      });
      toast.success("Contact added — invite SMS sent");
      setDraft({ ...emptyContact });
      setShowAdd(false);
      await load();
      await props.onMutated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Add failed");
    } finally { setSaving(false); }
  }

  async function deactivate(contactId: string) {
    if (!confirm("Deactivate this contact? They lose login access immediately.")) return;
    try {
      await api(`/api/v1/bi/admin/lenders/${lender.id}/contacts/${contactId}`, { method: "DELETE" });
      toast.success("Contact deactivated");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function resendInvite(contactId: string) {
    try {
      await api(`/api/v1/bi/admin/lenders/${lender.id}/contacts/${contactId}/resend-invite`, { method: "POST" });
      toast.success("Invite SMS resent");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Resend failed");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-white/60">
          {loading ? "Loading…" : `${contacts.length} contact${contacts.length === 1 ? "" : "s"}`}
        </p>
        <button
          onClick={() => setShowAdd(true)}
          className="rounded bg-brand-accent hover:bg-brand-accentHover text-white px-4 py-1.5 text-sm font-medium"
        >
          + Add contact
        </button>
      </div>

      {!loading && contacts.length === 0 ? (
        <div className="rounded border border-dashed border-white/15 p-6 text-center text-sm text-white/40">
          No contacts yet. Add one so a lender rep can OTP-login.
        </div>
      ) : (
        <ul className="divide-y divide-white/10 rounded border border-white/10 overflow-hidden">
          {contacts.map((c) => (
            <li key={c.id} className="px-4 py-3 flex items-start justify-between gap-3 hover:bg-white/5">
              <div className="min-w-0 flex-1">
                <div className="font-medium">
                  {c.full_name}
                  {c.is_primary ? <span className="ml-2 text-[10px] uppercase tracking-wider rounded bg-blue-500/15 text-blue-200 border border-blue-500/30 px-1.5 py-0.5">Primary</span> : null}
                  {!c.is_active ? <span className="ml-2 text-[10px] uppercase tracking-wider rounded bg-white/10 text-white/50 px-1.5 py-0.5">Inactive</span> : null}
                </div>
                <div className="text-xs text-white/50 mt-0.5 flex flex-wrap gap-x-3 gap-y-1">
                  {c.email ? <span>{c.email}</span> : null}
                  {c.phone_e164 ? <span className="font-mono">{c.phone_e164}</span> : null}
                  {c.role ? <span>{c.role}</span> : null}
                  {c.last_login_at ? <span>Last login {new Date(c.last_login_at).toLocaleDateString()}</span> : <span className="text-white/30">Never logged in</span>}
                </div>
              </div>
              {c.is_active ? (
                <div className="flex flex-col gap-1 text-xs">
                  <button onClick={() => resendInvite(c.id)} className="text-blue-300 hover:underline">Resend invite</button>
                  <button onClick={() => deactivate(c.id)} className="text-red-300 hover:underline">Deactivate</button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {showAdd ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-xl bg-[#112A4D] p-6">
            <h4 className="mb-1 text-lg font-semibold">Add contact to {lender.company_name}</h4>
            <p className="mb-4 text-xs text-white/60">
              They'll get an SMS invite with their OTP login link. The phone you enter is the one they'll use to sign in.
            </p>
            <div className="grid gap-3">
              <Input label="Full name *" value={draft.full_name} onChange={(v) => setDraft({ ...draft, full_name: v })} />
              <Input label="Mobile (E.164) *" value={draft.phone_e164} onChange={(v) => setDraft({ ...draft, phone_e164: v })} placeholder="+15875551234" />
              <Input label="Email" value={draft.email} onChange={(v) => setDraft({ ...draft, email: v })} type="email" />
              <Input label="Role / title" value={draft.role} onChange={(v) => setDraft({ ...draft, role: v })} placeholder="Loan Officer" />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button className="rounded border border-white/20 px-4 py-2" onClick={() => setShowAdd(false)} disabled={saving}>Cancel</button>
              <button className="rounded bg-brand-accent px-4 py-2 font-medium disabled:opacity-50" onClick={add} disabled={saving}>
                {saving ? "Saving…" : "Add + send invite"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// =====================================================================
// Small atoms
// =====================================================================
function Row(props: { k: string; v: string | null | undefined; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 py-1">
      <div className="text-white/50">{props.k}</div>
      <div className={props.mono ? "font-mono" : ""}>{props.v || "—"}</div>
    </div>
  );
}

function Input(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  containerClass?: string;
}) {
  return (
    <div className={props.containerClass}>
      <label className="mb-1 block text-sm">{props.label}</label>
      <input
        className="w-full rounded p-2 text-black"
        value={props.value}
        placeholder={props.placeholder}
        type={props.type || "text"}
        onChange={(e) => props.onChange(e.target.value)}
      />
    </div>
  );
}
