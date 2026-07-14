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

// BF_PORTAL_COMPOSER_JOB_POLL_v1 - the composer previously fired a queued
// blast and went blind ("Queued N recipients..."); with ALWAYS_QUEUE on the
// server every branded blast is queued, so a fully-rejected job (dead key,
// unverified sender) was invisible here. Poll the job like the raw email tab.
async function pollComposerJob(jobId: string, total: number, setMsg: (m: string) => void, setHeld: (held: boolean) => void): Promise<void> {
  type SendJob = { status?: string; total?: number; sent?: number; failed?: number; error?: string; not_before?: string };
  setMsg(`Queued ${total} recipients - sending in the background...`);
  for (let n = 0; n < 240; n++) {
    await new Promise((r) => setTimeout(r, 5000));
    try {
      const res = await api.get<{ data?: SendJob } & SendJob>(`/api/marketing/send-jobs/${jobId}`);
      const j = (res?.data ?? res) as SendJob;
      if (!j || !j.status) continue;
      if (j.status === "done") { setHeld(false); setMsg(`Done: sent ${j.sent ?? 0}${j.failed ? `, ${j.failed} failed` : ""} of ${j.total ?? total}.${j.error ? ` ${j.error}` : ""}`); return; }
      if (j.status === "failed") { setHeld(false); setMsg(`Send failed${j.error ? `: ${j.error}` : ""}.`); return; }
      // BF_PORTAL_SEND_HOLD_CANCEL_v1 - a job in its hold window is QUEUED, not sending.
      // Saying "Sending in background: 0 of N" made a cancellable blast look unstoppable.
      if (j.status === "queued" && j.not_before) {
        const secs = Math.max(0, Math.round((new Date(j.not_before).getTime() - Date.now()) / 1000));
        const mm = String(Math.floor(secs / 60));
        const ss = String(secs % 60).padStart(2, "0");
        setHeld(secs > 0);
        setMsg(secs > 0
          ? `Queued - sending in ${mm}:${ss}. You can still cancel.`
          : `Queued - starting now...`);
      } else if (j.status === "canceled") {
        setHeld(false);
        setMsg("Canceled. Nothing was sent.");
        return;
      } else {
        setHeld(false);
        setMsg(`Sending in background: ${j.sent ?? 0}${j.failed ? ` (+${j.failed} failed)` : ""} of ${j.total ?? total}...`);
      }
    } catch { /* keep polling */ }
  }
  setMsg("Still sending in the background - check back shortly.");
}

// EMAIL_AUDIENCE_INCL_EXCL_v1 - multi-select tag checkbox list.
function TagPicker({ title, hint, tags, selected, onToggle }: {
  title: string; hint: string; tags: { tag: string; n: number }[]; selected: string[]; onToggle: (tag: string) => void;
}) {
  return (
    <div>
      <div style={{ color: "var(--ui-text)", fontSize: "0.8rem", fontWeight: 600 }}>{title}</div>
      <div style={{ color: "var(--ui-text-muted)", fontSize: "0.72rem", marginBottom: 4 }}>{hint}</div>
      <div className="border rounded" style={{ borderColor: "var(--ui-border)", background: "var(--ui-surface-strong)", maxHeight: 140, overflowY: "auto", padding: "4px 8px" }}>
        {tags.length === 0 && <p style={{ color: "var(--ui-text-muted)", fontSize: "0.8rem", margin: "4px 0" }}>No tags yet.</p>}
        {tags.map((x) => (
          <label key={x.tag} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.8rem", color: "var(--ui-text)", padding: "2px 0", cursor: "pointer" }}>
            <input type="checkbox" checked={selected.includes(x.tag)} onChange={() => onToggle(x.tag)} />
            <span style={{ flex: 1 }}>{x.tag}</span>
            <span style={{ color: "var(--ui-text-muted)" }}>({x.n})</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export default function BrandedEmailComposer() {
  const [seg, setSeg] = useState<Seg | null>(null);
  // EMAIL_AUDIENCE_INCL_EXCL_v1 - multi-tag audience. Include empty = all
  // contacts; a contact needs AT LEAST ONE include tag; any exclude tag
  // removes the contact (exclude wins).
  const [include, setInclude] = useState<string[]>([]);
  const [exclude, setExclude] = useState<string[]>([]);
  const [audCount, setAudCount] = useState<number | null>(null);
  const [subject, setSubject] = useState("");
  const [tpl, setTpl] = useState<Tpl>(DEFAULTS);
  const [testTo, setTestTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [landingUrl, setLandingUrl] = useState(""); // BF_PORTAL_EMAIL_LANDING_v1
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null); // BF_PORTAL_SEND_HOLD_CANCEL_v1
  const [held, setHeld] = useState(false); // BF_PORTAL_SEND_HOLD_CANCEL_v1
  const [canceling, setCanceling] = useState(false); // BF_PORTAL_SEND_HOLD_CANCEL_v1
  const [preview, setPreview] = useState("");
  const [libName, setLibName] = useState(""); // BF_PORTAL_BLOCK_v206_EMAIL_LIB
  const [emailTpls, setEmailTpls] = useState<{ id: string; name: string; subject: string | null; body: string | null }[]>([]); // BF_PORTAL_TEMPLATE_ANALYTICS_v1
  const [currentTemplateId, setCurrentTemplateId] = useState<string | null>(null); // BF_PORTAL_TEMPLATE_ANALYTICS_v1
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
  const count = include.length === 0 && exclude.length === 0 ? (seg?.all ?? 0) : (audCount ?? 0);
  useEffect(() => {
    if (include.length === 0 && exclude.length === 0) { setAudCount(null); return; }
    let alive = true;
    const t = setTimeout(() => {
      const qs = new URLSearchParams();
      if (include.length) qs.set("include", include.join(","));
      if (exclude.length) qs.set("exclude", exclude.join(","));
      api.get<{ data?: { n?: number }; n?: number }>(`/api/marketing/email/audience-count?${qs.toString()}`)
        .then((r) => { if (alive) setAudCount(Number(r?.data?.n ?? r?.n ?? 0)); })
        .catch(() => { if (alive) setAudCount(0); });
    }, 250);
    return () => { alive = false; clearTimeout(t); };
  }, [include, exclude]);

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

  // BF_PORTAL_BLOCK_v206_EMAIL_LIB - save a named email template to the shared library.
  const saveNamed = async () => {
    if (!libName.trim() || !subject.trim()) return;
    try {
      const res = await api.post<{ data?: { landingUrl?: string } } & { landingUrl?: string }>("/api/marketing/templates", { channel: "email", name: libName.trim(), subject, body: tpl.body, html: preview });
      const url = (res?.data?.landingUrl ?? res?.landingUrl) || "";
      setLibName("");
      if (url) { setLandingUrl(url); setMsg("Email template saved. Copy the landing page URL below into your SMS template."); }
      else { setMsg("Email template saved to library."); }
    }
    catch { setMsg("Save failed."); }
  };

  useEffect(() => {
    api.get<{ data?: { items?: { id: string; name: string; subject: string | null; body: string | null }[] }; items?: { id: string; name: string; subject: string | null; body: string | null }[] }>("/api/marketing/templates?channel=email")
      .then((r) => setEmailTpls(r?.data?.items ?? r?.items ?? []))
      .catch(() => setEmailTpls([]));
  }, []); // BF_PORTAL_TEMPLATE_ANALYTICS_v1

  async function cancelSend() {
    if (!jobId) return;
    setCanceling(true);
    try {
      await api.post(`/api/marketing/send-jobs/${jobId}/cancel`, {});
      setHeld(false);
      setMsg("Canceled. Nothing was sent.");
    } catch (e) {
      setMsg(e instanceof Error ? `Cancel failed: ${e.message}` : "Cancel failed.");
    } finally {
      setCanceling(false);
    }
  } // BF_PORTAL_SEND_HOLD_CANCEL_v1

  const send = async (test?: string) => {
    setBusy(true); setMsg(null); setHeld(false); setJobId(null);
    try {
      const payload: Record<string, unknown> = { subject, ...tpl };
      if (currentTemplateId) payload.templateId = currentTemplateId; // BF_PORTAL_TEMPLATE_ANALYTICS_v1
      if (test) payload.test = test;
      else {
        if (include.length) payload.tags = include;
        if (exclude.length) payload.excludeTags = exclude;
      }
      const res = await api.post<{ data?: Record<string, unknown> } & Record<string, unknown>>("/api/marketing/email/send-template", payload);
      const r = (res?.data ?? res) as { test?: boolean; ok?: boolean; sent?: number; failed?: number; configured?: boolean; error?: string; queued?: boolean; jobId?: string; total?: number };
      if (r?.configured === false) setMsg("SendGrid not connected yet (set SENDGRID_API_KEY).");
      else if (r?.error) setMsg(r.error);
      else if (r?.test) setMsg(r.ok ? "Test sent." : "Test failed.");
      else if (r?.queued) { const id = String(r.jobId ?? ""); setJobId(id); void pollComposerJob(id, Number(r.total ?? count), setMsg, setHeld); } // BF_PORTAL_COMPOSER_JOB_POLL_v1
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
          <div className="text-sm" style={{ color: "var(--ui-text)" }}>Audience
            <div className="grid grid-cols-2 gap-2 mt-1">
              <TagPicker title="Include tags" hint={`Empty = all contacts (${seg?.all ?? 0})`} tags={seg?.segments ?? []} selected={include}
                onToggle={(t) => setInclude((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]))} />
              <TagPicker title="Exclude tags" hint="Removed even if included" tags={seg?.segments ?? []} selected={exclude}
                onToggle={(t) => setExclude((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]))} />
            </div>
            <p className="mt-1" style={{ color: "var(--ui-text-muted)", fontSize: "0.8rem" }}>Recipients: <strong style={{ color: "var(--ui-text)" }}>{count}</strong></p>
          </div>
          {emailTpls.length > 0 ? (
            <label className="text-sm block" style={{ color: "var(--ui-text)" }}>Load template
              <select value={currentTemplateId ?? ""} onChange={(e) => { const t = emailTpls.find((x) => x.id === e.target.value); if (t) { setSubject(t.subject ?? ""); setTpl((p) => ({ ...p, body: t.body ?? p.body })); setCurrentTemplateId(t.id); } else { setCurrentTemplateId(null); } }} className="block border rounded px-2 py-1 text-sm mt-1 w-full" style={inputStyle}>
                <option value="">&mdash; none &mdash;</option>
                {emailTpls.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
          ) : null}
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
            <input value={libName} onChange={(e) => setLibName(e.target.value)} placeholder="Template name" className="block border rounded px-2 py-1 text-sm" style={inputStyle} />
            <button type="button" disabled={!libName.trim() || !subject} onClick={() => void saveNamed()} className="ui-button ui-button--secondary">Save as template</button>
            <label className="text-sm" style={{ color: "var(--ui-text)" }}>Test to
              <input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="you@boreal.financial" className="block border rounded px-2 py-1 text-sm mt-1" style={inputStyle} />
            </label>
            <button type="button" disabled={busy || !subject || !testTo} onClick={() => void send(testTo)} className="ui-button ui-button--secondary">Send test</button>
            <button type="button" disabled={busy || !subject || !count} onClick={() => void send()} className="ui-button ui-button--primary">{busy ? "Sending..." : `Send to ${count}`}</button>
          </div>
          {msg ? <p style={{ color: "var(--ui-text-muted)" }}>{msg}</p> : null}
          {/* BF_PORTAL_SEND_HOLD_CANCEL_v1 */}
          {held && jobId ? (
            <button
              type="button"
              onClick={cancelSend}
              disabled={canceling}
              className="ml-2 rounded border border-red-500 px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {canceling ? "Canceling..." : "Cancel send"}
            </button>
          ) : null}
          {landingUrl ? (
            <div className="mt-2">
              <p style={{ color: "var(--ui-text-muted)", fontSize: "0.8rem" }}>Landing page URL (paste into your SMS template's landing page field):</p>
              <div className="flex gap-2 items-center mt-1">
                <input readOnly value={landingUrl} onFocus={(e) => e.currentTarget.select()} className="block border rounded px-2 py-1 text-sm w-full" style={inputStyle} />
                <button type="button" className="ui-button ui-button--secondary" onClick={() => { void navigator.clipboard?.writeText(landingUrl); setMsg("Landing URL copied."); }}>Copy</button>
              </div>
            </div>
          ) : null}
        </div>
        <div className="md:w-1/2">
          <div className="text-sm mb-1" style={{ color: "var(--ui-text-muted)" }}>Preview</div>
          <iframe title="Email preview" srcDoc={preview} style={{ width: "100%", height: 520, border: "1px solid var(--ui-border)", borderRadius: 8, background: "#fff" }} />
        </div>
      </div>
    </section>
  );
}
