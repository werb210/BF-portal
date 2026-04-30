// BI_PGI_ALIGNMENT_v56 — staff create/edit/deactivate lenders.
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { api } from "@/api";

type Lender = {
  id: string; company_name: string; website_url?: string | null;
  address_line1?: string | null; city?: string | null; province?: string | null;
  postal_code?: string | null; country: string;
  contact_full_name?: string | null; contact_email?: string | null; contact_phone_e164?: string | null;
  is_active: boolean;
};

const empty = { company_name: "", website_url: "", address_line1: "", city: "", province: "", postal_code: "", country: "CA", contact_full_name: "", contact_email: "", contact_phone_e164: "" };

export default function BILenderManagement() {
  const [lenders, setLenders] = useState<Lender[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ ...empty });
  const [saving, setSaving] = useState(false);

  useEffect(() => { void load(); }, []);
  async function load() {
    const r = await api<{ lenders: Lender[] }>("/api/v1/bi/admin/lenders");
    setLenders(r.lenders);
  }

  async function create() {
    setSaving(true);
    try {
      await api("/api/v1/bi/admin/lenders", { method: "POST", body: JSON.stringify(form) });
      toast.success("Lender created");
      setForm({ ...empty }); setShowCreate(false);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Create failed");
    } finally { setSaving(false); }
  }

  async function deactivate(id: string) {
    if (!confirm("Deactivate this lender?")) return;
    await api(`/api/v1/bi/admin/lenders/${id}`, { method: "DELETE" });
    toast.success("Deactivated");
    await load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-semibold">Lender Management</h2>
        <button className="bg-brand-accent hover:bg-brand-accentHover text-white rounded-full h-11 px-6 font-medium" onClick={() => setShowCreate(true)}>Create Lender</button>
      </div>

      <table className="w-full text-sm">
        <thead className="text-left text-white/60">
          <tr>
            <th className="py-2">Company</th><th>Contact</th><th>Phone</th><th>Email</th><th>Country</th><th>Status</th><th></th>
          </tr>
        </thead>
        <tbody>
          {lenders.map((l) => (
            <tr key={l.id} className="border-t border-white/10">
              <td className="py-3">
                <div className="font-medium">{l.company_name}</div>
                {l.website_url && <a href={l.website_url} className="text-xs text-blue-300" target="_blank" rel="noreferrer">{l.website_url}</a>}
              </td>
              <td>{l.contact_full_name}</td>
              <td>{l.contact_phone_e164}</td>
              <td>{l.contact_email}</td>
              <td>{l.country}</td>
              <td>{l.is_active ? <span className="text-emerald-300">Active</span> : <span className="text-white/40">Inactive</span>}</td>
              <td>{l.is_active && <button className="text-xs text-red-300 hover:underline" onClick={() => deactivate(l.id)}>Deactivate</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-[#112A4D] p-6">
            <h3 className="mb-4 text-xl font-semibold">Create Lender</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <Input label="Company name*" value={form.company_name} onChange={(v) => setForm({ ...form, company_name: v })} />
              <Input label="Website URL" value={form.website_url} onChange={(v) => setForm({ ...form, website_url: v })} />
              <Input label="Address line 1" value={form.address_line1} onChange={(v) => setForm({ ...form, address_line1: v })} />
              <Input label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
              <Input label="Province / State" value={form.province} onChange={(v) => setForm({ ...form, province: v })} />
              <Input label="Postal / Zip" value={form.postal_code} onChange={(v) => setForm({ ...form, postal_code: v })} />
              <div>
                <label className="mb-1 block text-sm">Country*</label>
                <select className="w-full rounded p-2 text-black" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}>
                  <option value="CA">Canada</option>
                  <option value="US">United States</option>
                </select>
              </div>
              <div className="md:col-span-2 mt-2 border-t border-white/10 pt-3 text-sm font-semibold">Primary contact (will receive OTP)</div>
              <Input label="Contact full name*" value={form.contact_full_name} onChange={(v) => setForm({ ...form, contact_full_name: v })} />
              <Input label="Contact mobile (E.164)*" value={form.contact_phone_e164} onChange={(v) => setForm({ ...form, contact_phone_e164: v })} placeholder="+15551234567" />
              <Input label="Contact email*" value={form.contact_email} onChange={(v) => setForm({ ...form, contact_email: v })} type="email" />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button className="rounded border border-white/20 px-4 py-2" onClick={() => setShowCreate(false)} disabled={saving}>Cancel</button>
              <button className="rounded bg-brand-accent px-4 py-2 font-medium disabled:opacity-50" onClick={create} disabled={saving}>{saving ? "Saving…" : "Create"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Input({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="mb-1 block text-sm">{label}</label>
      <input className="w-full rounded p-2 text-black" value={value} placeholder={placeholder} type={type} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
