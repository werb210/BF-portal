import { useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "@/api";
// BF_PORTAL_REFERRER_PORTAL_V2 - portal + add-referral rebuilt to the approved mockup.
// BF referral pipeline stages; a referral with no application (or an unknown stage)
// falls into "New".
const STAGES = ["New", "Requires Docs", "In Review", "Off to Lender", "Offer", "Accepted", "Funded", "Rejected"] as const;

type Referral = {
  id: string;
  full_name: string;
  company_name: string | null;
  email: string | null;
  phone_e164: string;
  application_id: string | null;
  application_stage: string | null;
  created_at: string;
};

const C = {
  navy: "#1f2d5a", ink: "#0f1729", muted: "#6b7280", line: "#e5e7eb", bg: "#f4f6fb",
  green: "#16a34a", greenBg: "#dcfce7", blue: "#2563eb",
};

function authHeader() {
  return { Authorization: `Bearer ${sessionStorage.getItem("referrer_token")}` };
}

// Format a North-American number as (XXX) XXX-XXXX while typing.
function formatPhone(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (isNaN(t)) return "";
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return "Just now";
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24); return `${d}d ago`;
}

// DRAFT preview copy - final wording set separately.
const MSG_PREVIEW: Record<"A" | "B", { label: string; text: string }> = {
  A: { label: "Version A · warm intro", text: "Hi, it's your referrer — I work with Boreal Financial and they've helped businesses like yours get funding fast. Mind if they reach out?" },
  B: { label: "Version B · straight to the point", text: "You've been referred to Boreal Financial for business funding. Start whenever you're ready — link below." },
};

const EMPTY = { first_name: "", last_name: "", business_name: "", email: "", phone: "" };

const ReferrerPortal = () => {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [refer, setRefer] = useState({ funding: true, pgi: false, startup: false });
  const [message, setMessage] = useState<"A" | "B">("A");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  useEffect(() => { void load(); }, []);

  async function load() {
    try {
      const res = await api<{ referrals: Referral[] }>("/api/referrer/pipeline", { headers: authHeader() });
      setReferrals(res.referrals || []);
    } catch { setReferrals([]); }
  }

  const grouped = useMemo(() => {
    const g: Record<string, Referral[]> = {}; STAGES.forEach((s) => (g[s] = []));
    referrals.forEach((r) => {
      const key = r.application_stage && (STAGES as readonly string[]).includes(r.application_stage) ? r.application_stage : "New";
      (g[key] ??= []).push(r);
    });
    return g;
  }, [referrals]);

  async function save(addAnother: boolean) {
    if (!form.first_name.trim() || !form.phone.trim()) { setErr("First name and mobile number are required."); return; }
    if (!refer.funding && !refer.pgi && !refer.startup) { setErr("Pick at least one option under \"Refer them to\"."); return; }
    const silos: string[] = [];
    if (refer.funding) silos.push("BF");
    if (refer.pgi) silos.push("BI");
    setSaving(true); setErr(null);
    try {
      await api("/api/referrer/add-referral", {
        method: "POST",
        body: JSON.stringify({
          first_name: form.first_name, last_name: form.last_name, business_name: form.business_name,
          email: form.email, phone: form.phone, silos, startup: refer.startup, message,
        }),
        headers: authHeader(),
      });
      setForm({ ...EMPTY });
      await load();
      if (addAnother) { setAdded(true); window.setTimeout(() => setAdded(false), 2200); }
      else { setShowModal(false); setRefer({ funding: true, pgi: false, startup: false }); setMessage("A"); }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't save the referral.");
    } finally { setSaving(false); }
  }

  const columns: { key: string; label: string }[] = STAGES.map((s) => ({ key: s, label: s }));

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0, background: C.bg, color: C.ink }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 22px", borderBottom: `1px solid ${C.line}`, background: "#fff" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: "-.01em" }}>My Referrals</h1>
          <p style={{ margin: "3px 0 0", color: C.muted, fontSize: 13 }}>Track every client you've referred, from intro to funded.</p>
        </div>
        <button type="button" onClick={() => { setShowModal(true); setErr(null); }} style={{ border: "none", borderRadius: 10, background: C.navy, color: "#fff", fontWeight: 700, fontSize: 14, padding: "11px 18px", cursor: "pointer" }}>+ Add referral</button>
      </div>
      <div style={{ display: "flex", gap: 16, overflowX: "auto", padding: "18px 22px 24px", flex: 1, minHeight: 0 }}>
        {columns.map((col) => {
          const list = grouped[col.key] ?? [];
          return <div key={col.key} style={{ flex: "0 0 288px", minWidth: 288, display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 14, color: "#374151", padding: "0 4px 12px" }}>{col.label} <span style={{ background: "#eef1f7", color: "#475569", fontSize: 12, fontWeight: 700, borderRadius: 999, padding: "1px 9px" }}>{list.length}</span></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, overflowY: "auto", flex: 1, minHeight: 0 }}>
              {list.length === 0 ? <div style={{ border: `1.5px dashed ${C.line}`, borderRadius: 12, color: "#9aa3b2", fontSize: 13, textAlign: "center", padding: "26px 10px" }}>No referrals here</div> : list.map((r) => {
                const funded = col.key === "Funded";
                return <div key={r.id} style={{ background: "#fff", border: `1px solid ${funded ? "#bbf7d0" : C.line}`, borderRadius: 12, padding: 14, boxShadow: "0 1px 2px rgba(16,24,40,.05)" }}>
                  <div style={{ fontWeight: 800, fontSize: 15, lineHeight: 1.25 }}>{r.company_name || r.full_name}</div>
                  {r.company_name ? <div style={{ color: C.blue, fontSize: 13, fontWeight: 600 }}>{r.full_name}</div> : null}
                  <div style={{ color: "#374151", fontSize: 13, marginTop: 6 }}>{r.application_id ? "In progress" : "Invited · awaiting application"}</div>
                  {funded ? <span style={{ display: "inline-block", background: C.greenBg, color: C.green, fontSize: 12, fontWeight: 700, borderRadius: 8, padding: "4px 8px", marginTop: 10 }}>Funded · commission earned</span> : null}
                  <div style={{ color: C.muted, fontSize: 12, marginTop: 10 }}>{timeAgo(r.created_at)}</div>
                </div>;
              })}
            </div>
          </div>;
        })}
      </div>
      {showModal && <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <div style={{ background: "#fff", borderRadius: 14, boxShadow: "0 20px 60px rgba(16,24,40,.25)", width: "100%", maxWidth: 460, maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "18px 22px", borderBottom: `1px solid ${C.line}` }}><h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Add a referral</h2><p style={{ margin: "3px 0 0", color: C.muted, fontSize: 13 }}>We'll text them an intro and take it from there.</p></div>
          <div style={{ padding: "20px 22px", overflowY: "auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}><Field label="First name"><Input value={form.first_name} onChange={(v) => setForm((s) => ({ ...s, first_name: v }))} /></Field><Field label="Last name"><Input value={form.last_name} onChange={(v) => setForm((s) => ({ ...s, last_name: v }))} /></Field></div>
            <Field label="Business name (optional)"><Input value={form.business_name} onChange={(v) => setForm((s) => ({ ...s, business_name: v }))} /></Field>
            <Field label="Email (optional)" hint="Used for updates."><Input type="email" inputMode="email" value={form.email} onChange={(v) => setForm((s) => ({ ...s, email: v }))} /></Field>
            <Field label="Mobile phone" hint="Required — this is where the intro text goes."><Input type="tel" inputMode="tel" value={form.phone} onChange={(v) => setForm((s) => ({ ...s, phone: formatPhone(v) }))} /></Field>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", margin: "8px 0 8px" }}>Refer them to</div>
            <Check checked={refer.funding} onChange={(c) => setRefer((s) => ({ ...s, funding: c }))} label="Funding" />
            <Check checked={refer.pgi} onChange={(c) => setRefer((s) => ({ ...s, pgi: c }))} label="Personal Guarantee Insurance" />
            <Check checked={refer.startup} onChange={(c) => setRefer((s) => ({ ...s, startup: c }))} label="Start-up funding" note="waitlist" />
            {refer.startup && <div style={{ fontSize: 12, color: C.muted, background: "#f7f9ff", border: `1px solid ${C.line}`, borderRadius: 8, padding: "9px 11px", margin: "2px 0 6px" }}>Start-up funding isn't open yet. We add this person to the start-up list and text them the moment it launches — no intro goes out now unless Funding or PGI is also picked.</div>}
            <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", margin: "16px 0 8px" }}>Intro message <span style={{ color: "#9aa3b2", fontWeight: 500 }}>— pick which text they receive</span></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{(["A", "B"] as const).map((v) => {
              const sel = message === v;
              return <div key={v} onClick={() => setMessage(v)} style={{ border: `1.5px solid ${sel ? C.navy : C.line}`, background: sel ? "#f7f9ff" : "#fff", borderRadius: 12, padding: "12px 12px 12px 14px", cursor: "pointer" }}><div style={{ display: "flex", alignItems: "center", gap: 9, fontWeight: 700, fontSize: 13, color: "#1f2937" }}><span style={{ width: 16, height: 16, borderRadius: 999, border: `2px solid ${sel ? C.navy : "#9aa3b2"}`, position: "relative", flexShrink: 0 }}>{sel ? <span style={{ position: "absolute", inset: 3, borderRadius: 999, background: C.navy }} /> : null}</span>{MSG_PREVIEW[v].label}</div><div style={{ margin: "10px 0 0 25px", background: "#e9edf6", color: "#111827", fontSize: 13, lineHeight: 1.45, borderRadius: 14, borderTopLeftRadius: 4, padding: "10px 12px" }}>{MSG_PREVIEW[v].text}</div></div>;
            })}</div>
            {added ? <div style={{ color: C.green, fontSize: 13, fontWeight: 700, marginTop: 12 }}>Added ✓ — form cleared for the next one.</div> : null}
            {err ? <div style={{ color: "#b91c1c", fontSize: 13, fontWeight: 600, marginTop: 10 }}>{err}</div> : null}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "16px 22px", borderTop: `1px solid ${C.line}`, background: "#fbfcfe", flexWrap: "wrap" }}><button type="button" onClick={() => setShowModal(false)} style={{ border: "none", borderRadius: 10, background: "#eef1f7", color: C.navy, fontWeight: 700, fontSize: 14, padding: "11px 18px", cursor: "pointer" }}>Cancel</button><button type="button" disabled={saving} onClick={() => void save(true)} style={{ border: "none", borderRadius: 10, background: "#eef1f7", color: C.green, fontWeight: 700, fontSize: 14, padding: "11px 18px", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>Save &amp; add another</button><button type="button" disabled={saving} onClick={() => void save(false)} style={{ border: "none", borderRadius: 10, background: C.navy, color: "#fff", fontWeight: 700, fontSize: 14, padding: "11px 18px", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>{saving ? "Saving…" : "Save referral"}</button></div>
        </div>
      </div>}
    </div>
  );
};

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}><label style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>{label}</label>{children}{hint ? <span style={{ fontSize: 11, color: "#9aa3b2" }}>{hint}</span> : null}</div>;
}

function Input({ value, onChange, type = "text", inputMode }: { value: string; onChange: (v: string) => void; type?: string; inputMode?: "email" | "tel" | "text" }) {
  return <input value={value} type={type} inputMode={inputMode} onChange={(e) => onChange(e.target.value)} style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: 10, padding: "11px 12px", fontSize: 15, color: "#0f1729", background: "#fff", boxSizing: "border-box" }} />;
}

function Check({ checked, onChange, label, note }: { checked: boolean; onChange: (c: boolean) => void; label: string; note?: string }) {
  return <label style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 14, marginBottom: 8, color: "#1f2937", cursor: "pointer" }}><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ width: 17, height: 17, accentColor: "#16a34a" }} />{label}{note ? <span style={{ color: "#9aa3b2" }}>— {note}</span> : null}</label>;
}

export default ReferrerPortal;
