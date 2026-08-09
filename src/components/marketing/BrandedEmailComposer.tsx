// BF_PORTAL_BRANDED_EMAIL_COMPOSER_v1
// BF_PORTAL_EMAIL_TWO_COLUMN_v1
import { useEffect, useRef, useState } from "react";
import { api, rawApiFetch } from "@/api";
// BF_PORTAL_SEND_LATER_v21
import { describeSchedule, localInputMax, localInputMin, toIsoInstant } from "./sendLater";
// BF_PORTAL_SCHEDULED_SENDS_v23
import { formatSendAt, pendingSends, sendJobCancelPath, sendJobsPath, type ScheduledSend } from "./scheduledSends";

// BF_PORTAL_EMAIL_PREVIEW_WIDTH_v1 - render at the email's desktop width and
// scale the canvas, rather than triggering its mobile breakpoint in the pane.
const EMAIL_PREVIEW_WIDTH = 600;
// BF_PORTAL_PREVIEW_FULL_WIDTH_v22 - the scale was Math.min(1, ...), so the
// preview could only ever shrink. On a wide screen it sat at 600px with dead
// space beside it. It now fills the pane, capped at 2x so a very wide monitor
// does not blow a 600px email up past the point of looking like an email.
const EMAIL_PREVIEW_MAX_SCALE = 2;
const EMAIL_PREVIEW_HEIGHT = 760;

type Seg = { configured: boolean; all: number; segments: { tag: string; n: number }[] };
type Tpl = {
  headline: string;
  heroUrl: string;
  heroLink: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  headline2: string;
  body2: string;
  rightImageUrl: string;
  rightImageLink: string;
  // BF_PORTAL_EMAIL_CTA2_v1
  cta2Label: string;
  cta2Url: string;
};
// BF_PORTAL_TEMPLATE_FIELDS_ROUNDTRIP_v7 - `fields` carries the whole composer
// state. Before it existed, saving to the library kept only subject/body/html,
// so picking a saved template restored those three and silently left the
// previous one's headline, images and buttons in place, right column blank.
type EmailLibraryTemplate = { id: string; name: string; subject: string | null; body: string | null; html: string | null; landingUrl: string | null; fields?: Partial<Tpl> | null };

const DEFAULTS: Tpl = {
  headline: "", heroUrl: "", heroLink: "", body: "",
  ctaLabel: "See If You Qualify", ctaUrl: "https://client.boreal.financial",
  headline2: "", body2: "", rightImageUrl: "", rightImageLink: "",
  cta2Label: "", cta2Url: "",
};

// BF_PORTAL_COMPOSER_JOB_POLL_v1 - the composer previously fired a queued
// blast and went blind ("Queued N recipients..."); with ALWAYS_QUEUE on the
// server every branded blast is queued, so a fully-rejected job (dead key,
// unverified sender) was invisible here. Poll the job like the raw email tab.
async function pollComposerJob(apiBase: string, jobId: string, total: number, setMsg: (m: string) => void, setHeld: (held: boolean) => void): Promise<void> {
  type SendJob = { status?: string; total?: number; sent?: number; failed?: number; error?: string; not_before?: string };
  setMsg(`Queued ${total} recipients - sending in the background...`);
  for (let n = 0; n < 240; n++) {
    await new Promise((r) => setTimeout(r, 5000));
    try {
      const res = await api.get<{ data?: SendJob } & SendJob>(`${apiBase}/send-jobs/${jobId}`);
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

export default function BrandedEmailComposer({ apiBase = "/api/marketing" }: { apiBase?: string }) {
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
  const [libName, setLibName] = useState("");
  // BF_PORTAL_EMAIL_SYMMETRIC_LAYOUT_v5
  const [resend, setResend] = useState(false); // BF_PORTAL_BLOCK_v206_EMAIL_LIB
  const [emailTpls, setEmailTpls] = useState<EmailLibraryTemplate[]>([]); // BF_PORTAL_TEMPLATE_ANALYTICS_v1
  const [currentTemplateId, setCurrentTemplateId] = useState<string | null>(null); // BF_PORTAL_TEMPLATE_ANALYTICS_v1
  const heroRef = useRef<HTMLInputElement>(null);
  const rightImageRef = useRef<HTMLInputElement>(null);
  const previewPaneRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(1);
  useEffect(() => {
    api.get<{ data?: Seg } & Partial<Seg>>(`${apiBase}/email/segments`)
      .then((r) => setSeg((r?.data ?? r) as Seg))
      .catch(() => setSeg({ configured: false, all: 0, segments: [] }));
    api.get<any>(`${apiBase}/email/template`)
      .then((r) => {
        const t = (r?.data?.template ?? r?.template) as Tpl | undefined;
        if (t && (t.headline || t.body || t.heroUrl || t.ctaLabel)) setTpl({ ...DEFAULTS, ...t });
      })
      .catch(() => {});
  }, [apiBase]);

  const set = (k: keyof Tpl, v: string) => setTpl((p) => ({ ...p, [k]: v }));
  const count = include.length === 0 && exclude.length === 0 ? (seg?.all ?? 0) : (audCount ?? 0);
  useEffect(() => {
    if (include.length === 0 && exclude.length === 0) { setAudCount(null); return; }
    let alive = true;
    const t = setTimeout(() => {
      const qs = new URLSearchParams();
      if (include.length) qs.set("include", include.join(","));
      if (exclude.length) qs.set("exclude", exclude.join(","));
      api.get<{ data?: { n?: number }; n?: number }>(`${apiBase}/email/audience-count?${qs.toString()}`)
        .then((r) => { if (alive) setAudCount(Number(r?.data?.n ?? r?.n ?? 0)); })
        .catch(() => { if (alive) setAudCount(0); });
    }, 250);
    return () => { alive = false; clearTimeout(t); };
  }, [apiBase, include, exclude]);

  useEffect(() => {
    let alive = true;
    // BF_PORTAL_PREVIEW_DEBOUNCE_v1: rendering on every keystroke can exhaust
    // the shared BI rate-limit budget. Only render after editing has paused.
    const timer = setTimeout(() => {
      api.post<any>(`${apiBase}/email/template/preview`, tpl)
        .then((r) => {
          if (!alive) return;
          const html = (r?.data?.html ?? r?.html ?? "") as string;
          // BF_PORTAL_PREVIEW_ALWAYS_RENDER_v18 - an empty response used to render
          // as a blank white box indistinguishable from a stale bundle or a dead
          // request. Say so instead.
          setPreview(html || "<p style=\"font:14px system-ui;padding:16px;color:#b45309\">Preview came back empty from the server.</p>");
        })
        .catch((e) => {
          if (!alive) return;
          const msg = e instanceof Error ? e.message : String(e);
          console.error("[composer] preview request failed", e);
          setPreview(`<p style="font:14px system-ui;padding:16px;color:#b91c1c">Preview failed: ${msg}</p>`);
        });
    }, 400);
    return () => { alive = false; clearTimeout(timer); };
  }, [apiBase, tpl]);

  useEffect(() => {
    const pane = previewPaneRef.current;
    if (!pane) return;
    const resize = () => setPreviewScale(Math.min(EMAIL_PREVIEW_MAX_SCALE, pane.clientWidth / EMAIL_PREVIEW_WIDTH));
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(pane);
    return () => observer.disconnect();
  }, []);

  // BF_PORTAL_EMAIL_SYMMETRIC_LAYOUT_v5 - image2 ("full-width image below the
  // frame") is gone. It rendered outside the column layout, so a two-column
  // email carried a stray banner underneath both columns.
  const upload = async (file: File, key: "heroUrl" | "rightImageUrl") => {
    setMsg(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await rawApiFetch(`${apiBase}/email/assets/upload`, { method: "POST", body: fd });
      const j: any = await res.json();
      const url = (j?.data?.url ?? j?.url) as string | undefined;
      if (url) set(key, url);
      else setMsg((j?.data?.error ?? j?.error ?? "Upload failed.") as string);
    } catch { setMsg("Upload failed."); }
  };

  const save = async () => {
    setSaving(true); setMsg(null);
    try { await api.post(`${apiBase}/email/template`, tpl); setMsg("Template saved."); }
    catch { setMsg("Save failed."); }
    finally { setSaving(false); }
  };

  // BF_PORTAL_BLOCK_v206_EMAIL_LIB - save a named email template to the shared library.
  const saveNamed = async () => {
    if (!libName.trim() || !subject.trim()) return;
    try {
      const res = await api.post<{ data?: { landingUrl?: string; replaced?: boolean } } & { landingUrl?: string; replaced?: boolean }>(`${apiBase}/templates`, { channel: "email", name: libName.trim(), subject, body: tpl.body, html: preview, fields: tpl });
      const url = (res?.data?.landingUrl ?? res?.landingUrl) || "";
      // BF_PORTAL_TEMPLATE_SAVE_BY_NAME_v8 - keep the name so a further edit
      // saves back to the same template instead of forking a new one.
      const wasReplaced = Boolean(res?.data?.replaced ?? res?.replaced);
      const what = wasReplaced ? "updated" : "saved";
      if (url) { setLandingUrl(url); setMsg(`Email template ${what}. Copy the landing page URL below into your SMS template.`); }
      else { setMsg(`Email template ${what} to library.`); }
    }
    catch { setMsg("Save failed."); }
  };

  useEffect(() => {
    api.get<{ data?: { items?: EmailLibraryTemplate[] }; items?: EmailLibraryTemplate[] }>(`${apiBase}/templates?channel=email`)
      .then((r) => setEmailTpls(r?.data?.items ?? r?.items ?? []))
      .catch(() => setEmailTpls([]));
  }, [apiBase]); // BF_PORTAL_TEMPLATE_ANALYTICS_v1

  async function cancelSend() {
    if (!jobId) return;
    setCanceling(true);
    try {
      // BF_PORTAL_SCHEDULED_SENDS_DONE_v24 - silo-aware path, and the server's
      // canceled:false is a refusal, not a success, so stop reporting it as one.
      const res = await api.post<{ canceled?: boolean; status?: string | null; reason?: string; data?: { canceled?: boolean; status?: string | null; reason?: string } }>(
        sendJobCancelPath(apiBase, jobId),
        {},
      );
      const out = (res?.data ?? res) as { canceled?: boolean; status?: string | null; reason?: string };
      if (out?.canceled === false) {
        setMsg(`Could not cancel: this send is ${out.status ?? out.reason ?? "already finished"}.`);
      } else {
        setHeld(false);
        setMsg("Canceled. Nothing was sent.");
      }
    } catch (e) {
      setMsg(e instanceof Error ? `Cancel failed: ${e.message}` : "Cancel failed.");
    } finally {
      setCanceling(false);
    }
  } // BF_PORTAL_SEND_HOLD_CANCEL_v1

  // BF_PORTAL_SEND_LATER_v21 - empty means send now, preserving the old behaviour.
  const [sendAtLocal, setSendAtLocal] = useState("");
  // BF_PORTAL_SCHEDULED_SENDS_v23 - staff can now inspect and cancel queued sends.
  const [scheduled, setScheduled] = useState<ScheduledSend[]>([]);
  const [scheduledBusy, setScheduledBusy] = useState(false);
  const loadScheduled = async () => {
    setScheduledBusy(true);
    try {
      const res = await api.get<{ jobs?: unknown[]; data?: { jobs?: unknown[] } }>(sendJobsPath(apiBase));
      const rows = (res?.jobs || res?.data?.jobs || []) as Record<string, unknown>[];
      setScheduled(pendingSends(rows));
    } catch {
      setScheduled([]);
    } finally {
      setScheduledBusy(false);
    }
  };
  useEffect(() => { void loadScheduled(); }, [apiBase]);
  const cancelScheduled = async (id: string) => {
    // BF_PORTAL_SCHEDULED_SENDS_DONE_v24 - swallowing the outcome made a refused
    // cancel look identical to a successful one: the row simply stayed put.
    try {
      const res = await api.post<{ canceled?: boolean; status?: string | null; reason?: string; data?: { canceled?: boolean; status?: string | null; reason?: string } }>(
        sendJobCancelPath(apiBase, id),
        {},
      );
      const out = (res?.data ?? res) as { canceled?: boolean; status?: string | null; reason?: string };
      if (out?.canceled === false) {
        setMsg(`Could not cancel: this send is ${out.status ?? out.reason ?? "already finished"}.`);
      }
    } catch (e) {
      setMsg(e instanceof Error ? `Cancel failed: ${e.message}` : "Cancel failed.");
    } finally {
      void loadScheduled();
    }
  };

  const send = async (test?: string) => {
    setBusy(true); setMsg(null); setHeld(false); setJobId(null);
    try {
      // BF_PORTAL_EMAIL_SYMMETRIC_LAYOUT_v5 - the server skips anyone already
      // emailed in the last 24h, which is right for a real blast and reported
      // itself as "sent 0 of 0" on a repeat test. `resend` overrides it.
      const payload: Record<string, unknown> = { subject, ...tpl, resend };
      if (currentTemplateId) payload.templateId = currentTemplateId; // BF_PORTAL_TEMPLATE_ANALYTICS_v1
      if (test) payload.test = test;
      else {
        if (include.length) payload.tags = include;
        if (exclude.length) payload.excludeTags = exclude;
        // BF_PORTAL_SEND_LATER_v21 - a test send is always immediate.
        const iso = toIsoInstant(sendAtLocal);
        if (iso) payload.sendAt = iso;
      }
      const res = await api.post<{ data?: Record<string, unknown> } & Record<string, unknown>>(`${apiBase}/email/send-template`, payload);
      const r = (res?.data ?? res) as { test?: boolean; ok?: boolean; sent?: number; failed?: number; configured?: boolean; error?: string; queued?: boolean; jobId?: string; total?: number; scheduled?: boolean };
      if (r?.configured === false) setMsg("SendGrid not connected yet (set SENDGRID_API_KEY).");
      else if (r?.error) setMsg(r.error);
      else if (r?.test) setMsg(r.ok
        ? "Test accepted by SendGrid. Acceptance is not delivery; if it does not arrive, check spam, sender authentication, and suppression lists."
        : `Test failed${r.error ? `: ${r.error}` : ""}.`);
      else if (r?.queued && r?.scheduled) {
        // BF_PORTAL_SEND_LATER_v21 - a scheduled job sits in the queue for
        // hours or days, so polling it to completion is pointless. Show when it
        // will go and leave it alone; the send-jobs list is where it is managed.
        setJobId(String(r.jobId ?? ""));
        setMsg(`Scheduled. ${describeSchedule(sendAtLocal)} Cancel it from the send jobs list before then.`);
      }
      else if (r?.queued) { const id = String(r.jobId ?? ""); setJobId(id); void pollComposerJob(apiBase, id, Number(r.total ?? count), setMsg, setHeld); } // BF_PORTAL_COMPOSER_JOB_POLL_v1
      else setMsg(`Sent ${r?.sent ?? 0}${r?.failed ? `, ${r.failed} failed` : ""}.`);
    } catch (e) {
      const status = typeof e === "object" && e !== null && "status" in e ? String(e.status) : "";
      const error = e instanceof Error ? e.message : String(e);
      setMsg(`Send failed${status ? ` (${status})` : ""}: ${error}`);
    }
    finally { setBusy(false); }
  };

  if (seg && !seg.configured) {
    return <section className="drawer-section"><div className="drawer-section__title mb-2">Email</div><p style={{ color: "var(--ui-text-muted)" }}>Not connected yet. Set SENDGRID_API_KEY and SENDGRID_FROM, and authenticate your sending domain, to send marketing email.</p></section>;
  }

  const inputStyle = { color: "var(--ui-text)", background: "var(--ui-surface-strong)", borderColor: "var(--ui-border)" };
  const labelCls = "text-sm block";
  const labelStyle = { color: "var(--ui-text)" } as const;
  const fieldCls = "block border rounded px-2 py-1 text-sm mt-1 w-full";

  // BF_PORTAL_EMAIL_SYMMETRIC_LAYOUT_v5
  // The email is two columns, so the form is two columns, in the order the
  // renderer emits: headline, image, image click link, body, button.
  // Everything that used to sit only on the left - hero image, the single
  // button - is now explicitly the LEFT column, because that is what it always
  // was in the rendered output. Nothing else: no extra image, no extra link.
  const columnFields = (side: "left" | "right") => {
    const isLeft = side === "left";
    const headlineKey = isLeft ? "headline" : "headline2";
    const imageKey = isLeft ? "heroUrl" : "rightImageUrl";
    const imageLinkKey = isLeft ? "heroLink" : "rightImageLink";
    const bodyKey = isLeft ? "body" : "body2";
    const ctaLabelKey = isLeft ? "ctaLabel" : "cta2Label";
    const ctaUrlKey = isLeft ? "ctaUrl" : "cta2Url";
    const fileRef = isLeft ? heroRef : rightImageRef;
    const imageUrl = tpl[imageKey as keyof Tpl] as string;

    return (
      <div className="space-y-2 rounded border p-3" style={{ borderColor: "var(--ui-border)" }}>
        <div className="text-sm font-semibold" style={labelStyle}>{isLeft ? "Left side" : "Right side"}</div>
        <label className={labelCls} style={labelStyle}>Headline
          <input value={tpl[headlineKey as keyof Tpl] as string} onChange={(e) => set(headlineKey as keyof Tpl, e.target.value)} className={fieldCls} style={inputStyle} />
        </label>
        <div className="text-sm" style={labelStyle}>Image
          <div className="flex gap-2 items-center mt-1">
            <button type="button" onClick={() => fileRef.current?.click()} className="ui-button ui-button--secondary">{imageUrl ? "Replace" : "Upload"}</button>
            {imageUrl ? <button type="button" onClick={() => set(imageKey as keyof Tpl, "")} className="ui-button ui-button--secondary">Remove</button> : null}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f, imageKey as "heroUrl" | "rightImageUrl"); e.target.value = ""; }} />
          </div>
        </div>
        <label className={labelCls} style={labelStyle}>Image click link
          <input value={tpl[imageLinkKey as keyof Tpl] as string} onChange={(e) => set(imageLinkKey as keyof Tpl, e.target.value)} placeholder="Optional" className={fieldCls} style={inputStyle} />
        </label>
        <label className={labelCls} style={labelStyle}>Body
          <textarea value={tpl[bodyKey as keyof Tpl] as string} onChange={(e) => set(bodyKey as keyof Tpl, e.target.value)} rows={6} className={fieldCls} style={inputStyle} />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className={labelCls} style={labelStyle}>Button label
            <input value={tpl[ctaLabelKey as keyof Tpl] as string} onChange={(e) => set(ctaLabelKey as keyof Tpl, e.target.value)} className={fieldCls} style={inputStyle} />
          </label>
          <label className={labelCls} style={labelStyle}>Button link
            <input value={tpl[ctaUrlKey as keyof Tpl] as string} onChange={(e) => set(ctaUrlKey as keyof Tpl, e.target.value)} className={fieldCls} style={inputStyle} />
          </label>
        </div>
        <p style={{ color: "var(--ui-text-muted)", fontSize: "0.8rem" }}>
          {isLeft
            ? "A button needs both a label and a link."
            : "Leave the right side empty for a single-column email."}
        </p>
      </div>
    );
  };

  return (
    <section className="drawer-section">
      <div className="drawer-section__title mb-2">Email campaign</div>

      {/* Audience first - you choose who before you write. */}
      <div className="text-sm" style={labelStyle}>Audience
        <div className="grid grid-cols-2 gap-2 mt-1">
          <TagPicker title="Include tags" hint={`Empty = all contacts (${seg?.all ?? 0})`} tags={seg?.segments ?? []} selected={include}
            onToggle={(t) => setInclude((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]))} />
          <TagPicker title="Exclude tags" hint="Removed even if included" tags={seg?.segments ?? []} selected={exclude}
            onToggle={(t) => setExclude((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]))} />
        </div>
        <p className="mt-1" style={{ color: "var(--ui-text-muted)", fontSize: "0.8rem" }}>Recipients: <strong style={{ color: "var(--ui-text)" }}>{count}</strong></p>
      </div>

      <div className="grid gap-2 md:grid-cols-2 mt-3">
        {emailTpls.length > 0 ? (
          <label className={labelCls} style={labelStyle}>Load template
            <select value={currentTemplateId ?? ""} onChange={(e) => {
              const t = emailTpls.find((x) => x.id === e.target.value);
              if (t) {
                setSubject(t.subject ?? "");
                // BF_PORTAL_TEMPLATE_FIELDS_ROUNDTRIP_v7 - replace the WHOLE form.
                // Merging into the previous state is what left one template's
                // headline and buttons attached to another template's body.
                // Templates saved before v7 have no `fields`, so they reset to
                // defaults plus their body rather than inheriting stale values.
                setTpl(t.fields ? { ...DEFAULTS, ...t.fields } : { ...DEFAULTS, body: t.body ?? "" });
                // BF_PORTAL_TEMPLATE_SAVE_BY_NAME_v8 - prefill the name box, so
                // editing and re-saving overwrites this template rather than
                // silently creating a second one with a retyped name. BF-Server
                // matches on the exact name, so a typo forks a duplicate.
                setLibName(t.name ?? "");
                setLandingUrl(t.landingUrl ?? "");
                // BF_PORTAL_PREVIEW_FALLBACK_v17 - only reuse the stored html when
                // there IS stored html. Templates seeded by SQL migration carry
                // `fields` but no `html` (SQL cannot render an email), so skipping
                // the render left the iframe blank with no way to recover short of
                // editing a field. When html is absent, let the effect rebuild the
                // preview from `fields` instead.
                // BF_PORTAL_PREVIEW_ALWAYS_RENDER_v18 - never reuse stored html on
                // load. Reusing it meant a template with no html (anything seeded by
                // SQL) showed an empty iframe, and a template WITH stale html showed
                // a preview that no longer matched its own fields. Rendering from
                // `fields` every time is always correct and costs one request.
                setPreview("");
                setCurrentTemplateId(t.id);
              } else {
                setCurrentTemplateId(null);
                setLandingUrl("");
              }
            }} className={fieldCls} style={inputStyle}>
              <option value="">&mdash; none &mdash;</option>
              {emailTpls.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
        ) : <div />}
        <label className={labelCls} style={labelStyle}>Subject
          <input value={subject} onChange={(e) => setSubject(e.target.value)} className={fieldCls} style={inputStyle} />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2 mt-3">
        {columnFields("left")}
        {columnFields("right")}
      </div>

      <p className="mt-2" style={{ color: "var(--ui-text-muted)", fontSize: "0.8rem" }}>Merge fields: {"{{first_name}}"}, {"{{name}}"}, {"{{company}}"}, {"{{email}}"}. Logo, colours and footer are fixed.</p>

      <div className="flex flex-wrap gap-2 items-end mt-2">
        <button type="button" disabled={saving} onClick={() => void save()} className="ui-button ui-button--secondary">{saving ? "Saving..." : "Save draft"}</button>
        <input value={libName} onChange={(e) => setLibName(e.target.value)} placeholder="Template name" className="block border rounded px-2 py-1 text-sm" style={inputStyle} />
        <button type="button" disabled={!libName.trim() || !subject} onClick={() => void saveNamed()} className="ui-button ui-button--secondary">Save to library</button>
        <label className="text-sm" style={labelStyle}>Test to
          <input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="you@boreal.financial" className="block border rounded px-2 py-1 text-sm mt-1" style={inputStyle} />
        </label>
        <button type="button" disabled={busy || !subject || !testTo} onClick={() => void send(testTo)} className="ui-button ui-button--secondary">Send test</button>
        <label className="text-sm" style={labelStyle}>Send at
          <input type="datetime-local" value={sendAtLocal} min={localInputMin()} max={localInputMax()} onChange={(e) => setSendAtLocal(e.target.value)} className="block border rounded px-2 py-1 text-sm mt-1" style={inputStyle} />
        </label>
        <button type="button" disabled={busy || !subject || !count} onClick={() => void send()} className="ui-button ui-button--primary">{busy ? (sendAtLocal ? "Scheduling..." : "Sending...") : (sendAtLocal ? `Schedule for ${count}` : `Send to ${count}`)}</button>
        <label className="text-sm flex items-center gap-1" style={labelStyle} title="Contacts emailed in the last 24 hours are skipped unless this is ticked.">
          <input type="checkbox" checked={resend} onChange={(e) => setResend(e.target.checked)} />
          Send again within 24h
        </label>
      </div>

      {msg ? <p style={{ color: "var(--ui-text-muted)" }}>{msg}</p> : null}
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
          <p style={{ color: "var(--ui-text-muted)", fontSize: "0.8rem" }}>Landing page URL (paste into your SMS template&apos;s landing page field):</p>
          <div className="flex gap-2 items-center mt-1">
            <input readOnly value={landingUrl} onFocus={(e) => e.currentTarget.select()} className="block border rounded px-2 py-1 text-sm w-full" style={inputStyle} />
            <button type="button" className="ui-button ui-button--secondary" onClick={() => { void navigator.clipboard?.writeText(landingUrl); setMsg("Landing URL copied."); }}>Copy</button>
          </div>
        </div>
      ) : null}

      {/* BF_PORTAL_SCHEDULED_SENDS_v23 */}
      <div className="mt-4">
        <div className="flex items-center gap-3">
          <div className="text-sm" style={{ color: "var(--ui-text-muted)" }}>Scheduled sends</div>
          <button type="button" onClick={() => void loadScheduled()} className="text-xs underline" style={{ color: "var(--ui-text-muted)" }}>Refresh</button>
        </div>
        {scheduledBusy && scheduled.length === 0 ? (
          <div className="text-sm mt-1" style={{ color: "var(--ui-text-muted)" }}>Loading…</div>
        ) : scheduled.length === 0 ? (
          <div className="text-sm mt-1" style={{ color: "var(--ui-text-muted)" }}>Nothing scheduled.</div>
        ) : (
          <table className="mt-2 w-full text-sm" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ color: "var(--ui-text-muted)", textAlign: "left" }}>
                <th className="py-1 pr-3">Template</th>
                <th className="py-1 pr-3">Recipients</th>
                <th className="py-1 pr-3">Sends</th>
                <th className="py-1 pr-3">Status</th>
                <th className="py-1"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {scheduled.map((job) => (
                <tr key={job.id} style={{ borderTop: "1px solid var(--ui-border)" }}>
                  <td className="py-1 pr-3">{job.name}</td>
                  <td className="py-1 pr-3">{job.total}</td>
                  <td className="py-1 pr-3">{formatSendAt(job.sendAt)}</td>
                  <td className="py-1 pr-3">{job.status}</td>
                  <td className="py-1"><button type="button" onClick={() => void cancelScheduled(job.id)} className="text-xs underline" style={{ color: "var(--ui-danger, #b91c1c)" }}>Cancel</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div ref={previewPaneRef} className="mt-4 min-w-0">
        <div className="text-sm mb-1" style={{ color: "var(--ui-text-muted)" }}>Preview</div>
        <div style={{ width: EMAIL_PREVIEW_WIDTH * previewScale, height: EMAIL_PREVIEW_HEIGHT * previewScale, overflow: "hidden" }}>
          <iframe title="Email preview" srcDoc={preview} style={{ width: EMAIL_PREVIEW_WIDTH, height: EMAIL_PREVIEW_HEIGHT, border: "1px solid var(--ui-border)", borderRadius: 8, background: "#fff", transform: `scale(${previewScale})`, transformOrigin: "top left" }} />
        </div>
      </div>
    </section>
  );
}
