// BF_PORTAL_BRANDED_EMAIL_COMPOSER_v1
import { useEffect, useRef, useState } from "react";
import { api, rawApiFetch } from "@/api";

type Seg = { configured: boolean; all: number; segments: { tag: string; n: number }[] };
type Tpl = { headline: string; heroUrl: string; heroLink: string; body: string; ctaLabel: string; ctaUrl: string; image2Url: string; image2Link: string };

const DEFAULTS: Tpl = {
  headline: "", heroUrl: "", heroLink: "", body: "",
  ctaLabel: "See If You Qualify", ctaUrl: "https://client.boreal.financial",
  image2Url: "", image2Link: "",
};

export default function BrandedEmailComposer() {
  const [seg, setSeg] = useState<Seg | null>(null);
  const [tag, setTag] = useState("__all__");
  const [subject, setSubject] = useState("");
  const [tpl, setTpl] = useState<Tpl>(DEFAULTS);
  const [testTo, setTestTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [preview, setPreview] = useState("");
  const heroRef = useRef<HTMLInputElement>(null);
  const img2Ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get<{ data?: Seg } & Partial<Seg>>("/api/marketing/email/segments")
      .then((r) => setSeg((r?.data ?? r) as Seg))
      .catch(() => setSeg({ configured: false, all: 0, segments: [] }));
    api.get<any>("/api/marketing/email/template")
      .then((r) => {
        const t = (r?.data?.template ?? r?.template) as Tpl | undefined;
        if (t && (t.headline || t.body || t.heroUrl || t.ctaLabel)) setTpl({ ...DEFAULTS, ...t });
      })
      .catch(() => {});
  }, []);

  const set = (k: keyof Tpl, v: string) => setTpl((p) => ({ ...p, [k]: v }));
  const count = tag === "__all__" ? (seg?.all ?? 0) : (seg?.segments.find((x) => x.tag === tag)?.n ?? 0);

  useEffect(() => {
    let alive = true;
    api.post<any>("/api/marketing/email/template/preview", tpl)
      .then((r) => { if (alive) setPreview((r?.data?.html ?? r?.html ?? "") as string); })
      .catch(() => {});
    return () => { alive = false; };
  }, [tpl]);

  const upload = async (file: File, key: "heroUrl" | "image2Url") => {
    setMsg(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await rawApiFetch("/api/marketing/email/assets/upload", { method: "POST", body: fd });
      const j: any = await res.json();
      const url = (j?.data?.url ?? j?.url) as string | undefined;
      if (url) set(key, url);
      else setMsg((j?.data?.error ?? j?.error ?? "Upload failed.") as string);
    } catch { setMsg("Upload failed."); }
  };

  const save = async () => {
    setSaving(true); setMsg(null);
    try { await api.post("/api/marketing/email/template", tpl); setMsg("Template saved."); }
    catch { setMsg("Save failed."); }
    finally { setSaving(false); }
  };

  const send = async (test?: string) => {
    setBusy(true); setMsg(null);
    try {
      const payload: Record<string, unknown> = { subject, ...tpl };
      if (test) payload.test = test;
      else if (tag !== "__all__") payload.tag = tag;
      const res = await api.post<{ data?: Record<string, unknown> } & Record<string, unknown>>("/api/marketing/email/send-template", payload);
      const r = (res?.data ?? res) as { test?: boolean; ok?: boolean; sent?: number; failed?: number; configured?: boolean; error?: string; queued?: boolean; total?: number };
      if (r?.configured === false) setMsg("SendGrid not connected yet (set SENDGRID_API_KEY).");
      else if (r?.error) setMsg(r.error);
      else if (r?.test) setMsg(r.ok ? "Test sent." : "Test failed.");
      else if (r?.queued) setMsg(`Queued ${r.total ?? count} recipients - sending in the background...`);
      else setMsg(`Sent ${r?.sent ?? 0}${r?.failed ? `, ${r.failed} failed` : ""}.`);
    } catch { setMsg("Send failed."); }
    finally { setBusy(false); }
  };

  if (seg && !seg.configured) {
    return <section className="drawer-section"><div className="drawer-section__title mb-2">Email</div><p style={{ color: "var(--ui-text-muted)" }}>Not connected yet. Set SENDGRID_API_KEY and SENDGRID_FROM, and authenticate your sending domain, to send marketing email.</p></section>;
  }

  const inputStyle = { color: "var(--ui-text)", background: "var(--ui-surface-strong)", borderColor: "var(--ui-border)" };
  return (
    <section className="drawer-section">
      <div className="drawer-section__title mb-2">Email campaign</div>
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="space-y-2 md:w-1/2">
          <label className="text-sm block" style={{ color: "var(--ui-text)" }}>Audience
            <select value={tag} onChange={(e) => setTag(e.target.value)} className="block border rounded px-2 py-1 text-sm mt-1 w-full" style={inputStyle}>
              <option value="__all__">All contacts ({seg?.all ?? 0})</option>
              {(seg?.segments ?? []).map((x) => <option key={x.tag} value={x.tag}>{x.tag} ({x.n})</option>)}
            </select>
          </label>
          <label className="text-sm block" style={{ color: "var(--ui-text)" }}>Subject
            <input value={subject} onChange={(e) => setSubject(e.target.value)} className="block border rounded px-2 py-1 text-sm mt-1 w-full" style={inputStyle} />
          </label>
          <label className="text-sm block" style={{ color: "var(--ui-text)" }}>Headline
            <input value={tpl.headline} onChange={(e) => set("headline", e.target.value)} className="block border rounded px-2 py-1 text-sm mt-1 w-full" style={inputStyle} />
          </label>
          <div className="text-sm" style={{ color: "var(--ui-text)" }}>Hero image
            <div className="flex gap-2 items-center mt-1">
              <button type="button" onClick={() => heroRef.current?.click()} className="ui-button ui-button--secondary">{tpl.heroUrl ? "Replace" : "Upload"}</button>
              {tpl.heroUrl ? <button type="button" onClick={() => set("heroUrl", "")} className="ui-button ui-button--secondary">Remove</button> : null}
              <input ref={heroRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f, "heroUrl"); e.target.value = ""; }} />
            </div>
            <input value={tpl.heroLink} onChange={(e) => set("heroLink", e.target.value)} placeholder="Image click link (optional)" className="block border rounded px-2 py-1 text-sm mt-1 w-full" style={inputStyle} />
          </div>
          <label className="text-sm block" style={{ color: "var(--ui-text)" }}>Body
            <textarea value={tpl.body} onChange={(e) => set("body", e.target.value)} rows={6} className="block border rounded px-2 py-1 text-sm mt-1 w-full" style={inputStyle} />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-sm block" style={{ color: "var(--ui-text)" }}>Button label
              <input value={tpl.ctaLabel} onChange={(e) => set("ctaLabel", e.target.value)} className="block border rounded px-2 py-1 text-sm mt-1 w-full" style={inputStyle} />
            </label>
            <label className="text-sm block" style={{ color: "var(--ui-text)" }}>Button link
              <input value={tpl.ctaUrl} onChange={(e) => set("ctaUrl", e.target.value)} className="block border rounded px-2 py-1 text-sm mt-1 w-full" style={inputStyle} />
            </label>
          </div>
          <div className="text-sm" style={{ color: "var(--ui-text)" }}>Second image (optional)
            <div className="flex gap-2 items-center mt-1">
              <button type="button" onClick={() => img2Ref.current?.click()} className="ui-button ui-button--secondary">{tpl.image2Url ? "Replace" : "Upload"}</button>
              {tpl.image2Url ? <button type="button" onClick={() => set("image2Url", "")} className="ui-button ui-button--secondary">Remove</button> : null}
              <input ref={img2Ref} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f, "image2Url"); e.target.value = ""; }} />
            </div>
            <input value={tpl.image2Link} onChange={(e) => set("image2Link", e.target.value)} placeholder="Image click link (optional)" className="block border rounded px-2 py-1 text-sm mt-1 w-full" style={inputStyle} />
          </div>
          <p style={{ color: "var(--ui-text-muted)", fontSize: "0.8rem" }}>Merge fields: {"{{first_name}}"}, {"{{name}}"}, {"{{company}}"}, {"{{email}}"}. Logo, colours and footer are fixed.</p>
          <div className="flex flex-wrap gap-2 items-end">
            <button type="button" disabled={saving} onClick={() => void save()} className="ui-button ui-button--secondary">{saving ? "Saving..." : "Save template"}</button>
            <label className="text-sm" style={{ color: "var(--ui-text)" }}>Test to
              <input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="you@boreal.financial" className="block border rounded px-2 py-1 text-sm mt-1" style={inputStyle} />
            </label>
            <button type="button" disabled={busy || !subject || !testTo} onClick={() => void send(testTo)} className="ui-button ui-button--secondary">Send test</button>
            <button type="button" disabled={busy || !subject || !count} onClick={() => void send()} className="ui-button ui-button--primary">{busy ? "Sending..." : `Send to ${count}`}</button>
          </div>
          {msg ? <p style={{ color: "var(--ui-text-muted)" }}>{msg}</p> : null}
        </div>
        <div className="md:w-1/2">
          <div className="text-sm mb-1" style={{ color: "var(--ui-text-muted)" }}>Preview</div>
          <iframe title="Email preview" srcDoc={preview} style={{ width: "100%", height: 520, border: "1px solid var(--ui-border)", borderRadius: 8, background: "#fff" }} />
        </div>
      </div>
    </section>
  );
}
