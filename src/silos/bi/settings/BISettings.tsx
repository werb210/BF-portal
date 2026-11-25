// BI_PGI_ALIGNMENT_v56 — profile-only settings.
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { api } from "@/api";
import { EmailSignaturePanel } from "@/pages/settings/tabs/ProfileSettings"; // BF_PORTAL_SAME_MENU_v1
import SharedMailboxSignatures from "@/pages/settings/tabs/SharedMailboxSignatures";

type Me = { id: string; full_name: string; email: string; phone_e164: string };

export default function BISettings() {
  const [me, setMe] = useState<Me | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { api<Me>("/api/v1/bi/me").then(setMe).catch(() => setMe(null)); }, []);
  async function save() {
    if (!me) return;
    setSaving(true);
    try {
      await api("/api/v1/bi/me", { method: "PATCH", body: JSON.stringify({ full_name: me.full_name, email: me.email, phone_e164: me.phone_e164 }) });
      toast.success("Profile saved");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  }
  // BF_PORTAL_SAME_MENU_v1 - Settings is in the BI menu now: profile plus Boreal Risk Management email signatures.
  const signatures = (
    <div className="mt-10 grid gap-8">
      <section>
        <h3 className="text-lg font-semibold mb-1">Your Boreal Risk Management signature</h3>
        <p className="text-sm text-white/60 mb-3">Added when you email from Boreal Risk Management as yourself. Your Boreal Financial signature is separate.</p>
        <EmailSignaturePanel />
      </section>
      <section>
        <h3 className="text-lg font-semibold mb-1">Shared mailboxes</h3>
        <SharedMailboxSignatures />
      </section>
    </div>
  );
  if (!me) return <div><h2 className="text-3xl font-semibold mb-6">Settings</h2>{signatures}</div>;
  return (
    <div>
      <h2 className="text-3xl font-semibold mb-6">Settings</h2>
      <div className="max-w-xl">
      <h3 className="text-lg font-semibold mb-3">Profile</h3>
      <div className="grid gap-3">
        <div><label className="text-sm">Full name</label><input className="w-full rounded p-2 text-black" value={me.full_name} onChange={(e) => setMe({ ...me, full_name: e.target.value })} /></div>
        <div><label className="text-sm">Email</label><input className="w-full rounded p-2 text-black" value={me.email} onChange={(e) => setMe({ ...me, email: e.target.value })} /></div>
        <div><label className="text-sm">Mobile (E.164)</label><input className="w-full rounded p-2 text-black" value={me.phone_e164} onChange={(e) => setMe({ ...me, phone_e164: e.target.value })} /></div>
        <button className="mt-3 rounded bg-brand-accent px-4 py-2 font-medium disabled:opacity-50" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
      </div>
      </div>
      {signatures}
    </div>
  );
}
