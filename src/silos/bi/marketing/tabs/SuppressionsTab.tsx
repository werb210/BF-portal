// BF_PORTAL_BLOCK_BI_ROUND8_MARKETING_UI_v1
import { useEffect, useState } from "react";
import { api } from "@/api";

type Channel = "all" | "sms" | "email" | "call";

type Suppression = {
  id: string;
  contact_id: string | null;
  contact_name: string | null;
  phone_e164: string | null;
  email: string | null;
  channel: Channel;
  reason: string;
  created_at: string;
};

export default function SuppressionsTab() {
  const [list, setList] = useState<Suppression[]>([]);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [channel, setChannel] = useState<Channel>("all");

  const load = async () => {
    try {
      const r = await api<{ suppressions: Suppression[] }>("/api/v1/bi/marketing/suppressions");
      setList(r.suppressions || []);
    } catch {
      setList([]);
    }
  };
  useEffect(() => { void load(); }, []);

  const add = async () => {
    if (!phone && !email) { alert("Phone or email required"); return; }
    try {
      await api("/api/v1/bi/marketing/suppressions", {
        method: "POST",
        body: JSON.stringify({ phone_e164: phone || null, email: email || null, channel, reason: "manual" }),
      });
      setPhone(""); setEmail("");
      void load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Add failed");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this suppression?")) return;
    try {
      await api(`/api/v1/bi/marketing/suppressions/${id}`, { method: "DELETE" });
      void load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Remove failed");
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Suppressions</h3>
      <div className="bg-brand-bgAlt border border-card rounded-xl p-4 grid gap-3 md:grid-cols-4">
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+15551234567" className="rounded border border-card bg-brand-surface px-3 py-2 text-sm text-white" />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" className="rounded border border-card bg-brand-surface px-3 py-2 text-sm text-white" />
        <select value={channel} onChange={(e) => setChannel(e.target.value as Channel)} className="rounded border border-card bg-brand-surface px-3 py-2 text-sm text-white">
          <option value="all">All channels</option>
          <option value="sms">SMS only</option>
          <option value="email">Email only</option>
          <option value="call">Call only</option>
        </select>
        <button onClick={() => void add()} className="rounded bg-blue-500/20 hover:bg-blue-500/30 px-3 py-2 text-sm text-blue-200">Add</button>
      </div>
      <ul className="space-y-1">
        {list.map((s) => (
          <li key={s.id} className="flex items-center justify-between bg-brand-surface border border-card rounded p-2 text-sm">
            <div className="min-w-0">
              <span className="text-white">{/* BF_PORTAL_BLOCK_v836_SUPPRESSION_SHOW_NAME */ s.contact_name || s.phone_e164 || s.email || "(unknown)"}</span>
              <span className="ml-2 text-xs text-white/40">{s.channel} {String.fromCharCode(8226)} {s.reason}</span>
            </div>
            <button onClick={() => void remove(s.id)} className="text-xs text-rose-300 hover:text-rose-200">Remove</button>
          </li>
        ))}
        {list.length === 0 && <li className="text-white/50 italic">No suppressions.</li>}
      </ul>
    </div>
  );
}
