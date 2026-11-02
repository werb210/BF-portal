// BF_PORTAL_v874_MARKETING_TOOLS - Marketing > Website kit (ported from KS-Portal #42 without the Marketing add-on or
// the form limit). For a website other than Boreal's own sites (a partner page, a campaign landing page): list its
// address, copy one script tag and a placeholder for each form. Each silo chosen in the topbar has its own kit, and its
// leads land in that silo. The AI chat (Maya) and the tracking script are optional; tracking waits for the visitor to
// accept the cookie banner, and the consent box next to a form is never pre-ticked.
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { api } from "@/api";
import { serverMessage, unwrap } from "@/components/marketing/marketingTools";

type Field = { key: string; label: string; required: boolean };
export type KitForm = { id: string; name: string; fields: Field[]; button_label: string; thank_you: string; tag: string | null; active: boolean; submissions: number; live: boolean };
type KitSettings = { key: string; allowed_origins: string[]; chat_enabled: boolean; tracking_enabled: boolean; consent_banner: boolean };
export type KitOverview = {
  silo?: string;
  brand?: string;
  consent_text?: string;
  settings: KitSettings;
  forms: KitForm[];
  snippet: { script: string; forms: Array<{ id: string; name: string; html: string }> };
};

export const FIELD_CHOICES: Array<{ key: string; label: string }> = [
  { key: "full_name", label: "Full name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "company", label: "Business name" },
  { key: "amount", label: "Amount needed" },
  { key: "message", label: "Message" },
];

const input: CSSProperties = { color: "var(--ui-text)", background: "var(--ui-surface-strong)", borderColor: "var(--ui-border)" };
const code: CSSProperties = { display: "block", whiteSpace: "pre-wrap", wordBreak: "break-all", padding: 8, borderRadius: 6, border: "1px solid var(--ui-border)", background: "var(--ui-surface-strong)", color: "var(--ui-text)", fontSize: 12 };

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className="ui-button ui-button--secondary" onClick={() => { void navigator.clipboard?.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1500); }, () => setDone(false)); }}>
      {done ? "Copied" : label}
    </button>
  );
}

function FormEditor({ initial, onSave, onCancel, busy }: { initial?: KitForm; onSave: (f: Omit<KitForm, "id" | "submissions" | "live">) => void; onCancel: () => void; busy: boolean }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [fields, setFields] = useState<Field[]>(initial?.fields ?? [
    { key: "full_name", label: "Full name", required: true },
    { key: "email", label: "Email", required: true },
    { key: "phone", label: "Phone", required: false },
    { key: "message", label: "How can we help?", required: false },
  ]);
  const [button, setButton] = useState(initial?.button_label ?? "Send");
  const [thanks, setThanks] = useState(initial?.thank_you ?? "Thank you. We will be in touch shortly.");
  const [tag, setTag] = useState(initial?.tag ?? "");
  const [active, setActive] = useState(initial?.active ?? true);
  const has = (k: string) => fields.find((f) => f.key === k);
  const toggle = (k: string, label: string) => setFields((fs) => (has(k) ? fs.filter((f) => f.key !== k) : [...fs, { key: k, label, required: false }]));
  const setReq = (k: string, required: boolean) => setFields((fs) => fs.map((f) => (f.key === k ? { ...f, required } : f)));
  const setLabel = (k: string, label: string) => setFields((fs) => fs.map((f) => (f.key === k ? { ...f, label } : f)));
  return (
    <div className="border rounded p-3 space-y-2" style={{ borderColor: "var(--ui-border)" }} data-testid="kit-form-editor">
      <label className="text-sm block" style={{ color: "var(--ui-text)" }}>Form name
        <input value={name} onChange={(e) => setName(e.target.value)} className="block border rounded px-2 py-1 text-sm mt-1 w-full" style={input} />
      </label>
      <fieldset className="text-sm" style={{ color: "var(--ui-text)" }}>
        <legend className="font-medium">Questions</legend>
        <p style={{ color: "var(--ui-text-muted)", fontSize: 12, margin: "2px 0 6px" }}>Every form asks for an email or a phone number so you can reach the lead.</p>
        {FIELD_CHOICES.map((c) => {
          const f = has(c.key);
          return (
            <div key={c.key} className="flex flex-wrap items-center gap-2 mb-1">
              <label className="flex items-center gap-2" style={{ minWidth: 150 }}>
                <input type="checkbox" checked={Boolean(f)} onChange={() => toggle(c.key, c.label)} /> {c.label}
              </label>
              {f && (
                <>
                  <input aria-label={`${c.label} wording`} value={f.label} onChange={(e) => setLabel(c.key, e.target.value)} className="border rounded px-2 py-1 text-sm" style={input} />
                  <label className="flex items-center gap-1"><input type="checkbox" checked={f.required} onChange={(e) => setReq(c.key, e.target.checked)} /> Required</label>
                </>
              )}
            </div>
          );
        })}
      </fieldset>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="text-sm" style={{ color: "var(--ui-text)" }}>Button
          <input value={button} onChange={(e) => setButton(e.target.value)} className="block border rounded px-2 py-1 text-sm mt-1 w-full" style={input} />
        </label>
        <label className="text-sm" style={{ color: "var(--ui-text)" }}>Tag new leads (optional)
          <input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="equipment_quote" className="block border rounded px-2 py-1 text-sm mt-1 w-full" style={input} />
        </label>
      </div>
      <label className="text-sm block" style={{ color: "var(--ui-text)" }}>Thank-you message
        <input value={thanks} onChange={(e) => setThanks(e.target.value)} className="block border rounded px-2 py-1 text-sm mt-1 w-full" style={input} />
      </label>
      <label className="text-sm flex items-center gap-2" style={{ color: "var(--ui-text)" }}>
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Taking submissions
      </label>
      <div className="flex gap-2">
        <button type="button" className="ui-button ui-button--primary" disabled={busy || !name.trim()} onClick={() => onSave({ name: name.trim(), fields, button_label: button, thank_you: thanks, tag: tag.trim() || null, active })}>Save form</button>
        <button type="button" className="ui-button ui-button--secondary" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

export default function WebsiteKitPanel() {
  const [kit, setKit] = useState<KitOverview | null>(null);
  const [origins, setOrigins] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | "new" | null>(null);

  const apply = useCallback((k: KitOverview) => {
    setKit(k);
    setOrigins(k.settings.allowed_origins.join("\n"));
  }, []);
  useEffect(() => {
    api.get<KitOverview>("/api/website-kit").then((r) => apply(unwrap<KitOverview>(r))).catch(() => setMsg("The website kit could not be loaded. Please try again."));
  }, [apply]);

  const run = async (fn: () => Promise<unknown>, ok: string, fail: string) => {
    setBusy(true); setMsg(null);
    try { apply(unwrap<KitOverview>(await fn())); setMsg(ok); return true; }
    catch (e) { setMsg(serverMessage(e, fail)); return false; }
    finally { setBusy(false); }
  };
  const saveSettings = (patch: Partial<KitSettings>) => run(
    () => api.put("/api/website-kit/settings", { ...kit!.settings, allowed_origins: origins.split(/[\s,]+/).filter(Boolean), ...patch }),
    "Saved.", "Could not save. Please try again.",
  );

  if (!kit) return <section className="drawer-section"><div className="drawer-section__title mb-2">Website kit</div><p style={{ color: "var(--ui-text-muted)" }}>{msg ?? "Loading…"}</p></section>;

  return (
    <div className="space-y-4" data-testid="website-kit">
      <section className="drawer-section">
        <div className="drawer-section__title mb-1">Website kit{kit.brand ? ` for ${kit.brand}` : ""}</div>
        <p style={{ color: "var(--ui-text-muted)", fontSize: 13, marginBottom: 8 }}>
          For a website other than Boreal&apos;s own sites (a partner page or a campaign landing page). Leads from it land in this silo&apos;s CRM.
          List the addresses of the website where you will put the kit. The forms, chat and tracking only work on these.
        </p>
        <label className="text-sm block" style={{ color: "var(--ui-text)" }}>Website addresses (one per line)
          <textarea value={origins} onChange={(e) => setOrigins(e.target.value)} rows={2} placeholder="https://www.partner-site.ca" className="block border rounded px-2 py-1 text-sm mt-1 w-full" style={input} />
        </label>
        <div className="flex flex-wrap gap-2 mt-2">
          <button type="button" className="ui-button ui-button--primary" disabled={busy} onClick={() => void saveSettings({})}>Save addresses</button>
        </div>
      </section>

      <section className="drawer-section">
        <div className="drawer-section__title mb-1">Copy this onto your website</div>
        <p style={{ color: "var(--ui-text-muted)", fontSize: 13, marginBottom: 6 }}>Put the script once on every page (just before the closing body tag), then put each form&apos;s placeholder where the form should appear.</p>
        <code style={code} data-testid="kit-script">{kit.snippet.script}</code>
        <div className="flex gap-2 mt-2">
          <CopyButton text={kit.snippet.script} label="Copy script" />
          <button type="button" className="ui-button ui-button--secondary" disabled={busy} onClick={() => { if (window.confirm("Make a new key? The script already on the website stops working until you paste the new one.")) void run(() => api.post("/api/website-kit/settings/new-key", {}), "New key made. Paste the new script on your website.", "Could not make a new key."); }}>Make a new key</button>
        </div>
      </section>

      <section className="drawer-section">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <div className="drawer-section__title">Lead forms</div>
        </div>
        <p style={{ color: "var(--ui-text-muted)", fontSize: 13, marginBottom: 8 }}>Each submission becomes a contact in this silo&apos;s CRM, tagged with the form, given an owner by lead rotation when that is on for website leads, and your team is notified.</p>
        {kit.consent_text && (
          <p data-testid="kit-consent-text" style={{ color: "var(--ui-text)", fontSize: 13, marginBottom: 8 }}>
            Every form has an unticked consent box: &ldquo;{kit.consent_text}&rdquo; Express consent is recorded only when the person ticks it.
          </p>
        )}
        {kit.forms.length === 0 && <p style={{ color: "var(--ui-text-muted)" }}>No forms yet.</p>}
        <div className="space-y-2">
          {kit.forms.map((f) => {
            const snip = kit.snippet.forms.find((x) => x.id === f.id);
            return editing === f.id ? (
              <FormEditor key={f.id} initial={f} busy={busy} onCancel={() => setEditing(null)} onSave={(v) => void run(() => api.put(`/api/website-kit/forms/${f.id}`, v), "Form saved.", "Could not save the form.").then((ok) => ok && setEditing(null))} />
            ) : (
              <div key={f.id} className="border rounded px-3 py-2" style={{ borderColor: "var(--ui-border)" }} data-testid={`kit-form-${f.id}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <strong style={{ color: "var(--ui-text)" }}>{f.name}</strong>
                  <span className="text-xs px-2 py-0.5 rounded" style={{ background: "var(--ui-surface-strong)", color: "var(--ui-text)" }}>{f.active ? "Live" : "Paused"}</span>
                  <span className="text-xs" style={{ color: "var(--ui-text-muted)" }}>{f.submissions} submission{f.submissions === 1 ? "" : "s"}</span>
                  <span className="flex gap-2 ml-auto">
                    <button type="button" className="ui-button ui-button--secondary" onClick={() => setEditing(f.id)}>Edit</button>
                    <button type="button" className="ui-button ui-button--secondary" disabled={busy} onClick={() => { if (window.confirm(`Delete the form "${f.name}"?`)) void run(() => api.delete(`/api/website-kit/forms/${f.id}`), "Form deleted.", "Could not delete the form."); }}>Delete</button>
                  </span>
                </div>
                {snip && (
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <code style={{ ...code, display: "inline-block" }}>{snip.html}</code>
                    <CopyButton text={snip.html} label="Copy placeholder" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {editing === "new" && <div className="mt-2"><FormEditor busy={busy} onCancel={() => setEditing(null)} onSave={(v) => void run(() => api.post("/api/website-kit/forms", v), "Form added. Copy its placeholder onto your website.", "Could not add the form.").then((ok) => ok && setEditing(null))} /></div>}
        {editing === null && <button type="button" className="ui-button ui-button--primary mt-2" onClick={() => setEditing("new")}>New form</button>}
      </section>

      <section className="drawer-section">
        <div className="drawer-section__title mb-1">AI chat and tracking</div>
        <div className="space-y-2 text-sm" style={{ color: "var(--ui-text)" }}>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={kit.settings.chat_enabled} disabled={busy} onChange={(e) => void saveSettings({ chat_enabled: e.target.checked })} />
              AI chat widget: visitors chat with Maya; conversations show under Communications.
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={kit.settings.tracking_enabled} disabled={busy} onChange={(e) => void saveSettings({ tracking_enabled: e.target.checked })} />
              Tracking script: pages visited show on the contact once they fill in a form.
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={kit.settings.consent_banner} disabled={busy} onChange={(e) => void saveSettings({ consent_banner: e.target.checked })} />
              Show the kit&apos;s cookie banner. Nothing is tracked until a visitor accepts. If the website has its own banner, turn this off and have it call <code>WebsiteKit.consent(true)</code> when a visitor accepts.
            </label>
        </div>
      </section>
      {msg && <p role="status" style={{ color: "var(--ui-text)", fontSize: 13 }}>{msg}</p>}
    </div>
  );
}
