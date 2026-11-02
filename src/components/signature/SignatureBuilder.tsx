// BF_PORTAL_v864_SIGNATURE_BUILDER - build an email signature from your details and the company's brand (logo and
// colour), with a live preview. It writes email-safe table HTML (signatureHtml.ts). "Paste your own HTML" stays as
// the advanced option. Used for your own signature and for each shared mailbox's signature.
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { buildSignatureHtml, decodeFields, EMPTY_FIELDS, safeColor, type SignatureFields } from "./signatureHtml";

type Props = {
  /** The saved HTML (may be empty, a builder signature, or hand-written HTML). */
  html: string;
  /** Fill-ins for a new signature: the user's name / email / phone, the brand, the booking link. */
  defaults: Partial<SignatureFields>;
  disabled?: boolean;
  /** Called with the HTML to save whenever the signature changes. */
  onChange: (html: string) => void;
  label: string;
  /** Shared mailboxes have no title / mobile / booking link of their own by default; the fields stay available. */
  testIdPrefix?: string;
};

const FIELD_ROWS: Array<Array<[keyof SignatureFields, string, string]>> = [
  [["name", "Name", "Todd Werboweski"], ["title", "Title", "Director"]],
  [["company", "Company", "Boreal Financial"], ["email", "Email", "name@company.com"]],
  [["phone", "Phone", "(866) 555-0100"], ["mobile", "Mobile (optional)", ""]],
  [["website", "Website", "https://boreal.financial"], ["bookingUrl", "Booking link", "https://..."]],
  [["linkedin", "LinkedIn", "https://linkedin.com/in/..."], ["x", "X (Twitter)", "https://x.com/..."]],
  [["facebook", "Facebook", "https://facebook.com/..."], ["instagram", "Instagram", "https://instagram.com/..."]],
];

export default function SignatureBuilder({ html, defaults, disabled, onChange, label, testIdPrefix = "sig" }: Props) {
  const saved = useMemo(() => decodeFields(html), [html]);
  // A signature that was not made here (pasted HTML) opens in the advanced editor so nothing is lost.
  const [mode, setMode] = useState<"builder" | "html">(() => (html.trim() && !decodeFields(html) ? "html" : "builder"));
  const [fields, setFields] = useState<SignatureFields>(() => ({ ...EMPTY_FIELDS, ...defaults, ...(saved ?? {}) }));
  const [raw, setRaw] = useState(html);

  // A different mailbox, or the saved signature arriving after the first render.
  useEffect(() => {
    const decoded = decodeFields(html);
    setRaw(html);
    if (decoded) { setFields({ ...EMPTY_FIELDS, ...decoded }); setMode("builder"); }
    else if (html.trim()) setMode("html");
    else setFields((prev) => ({ ...EMPTY_FIELDS, ...defaults, ...pickFilled(prev, ["name", "title", "phone", "mobile"]) }));
    // defaults are fill-ins only; re-running on each defaults object would overwrite what the user typed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html]);

  // Defaults that load later (brand, booking link) fill only empty fields.
  useEffect(() => {
    setFields((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const [k, v] of Object.entries(defaults) as Array<[keyof SignatureFields, unknown]>) {
        if (v !== undefined && v !== "" && (prev[k] === "" || prev[k] === undefined)) { (next as Record<string, unknown>)[k] = v; changed = true; }
      }
      return changed ? next : prev;
    });
  }, [defaults]);

  const built = useMemo(() => buildSignatureHtml(fields), [fields]);
  const current = mode === "builder" ? built : raw;
  useEffect(() => { onChange(current); }, [current, onChange]);

  const set = (k: keyof SignatureFields, v: string | number) => setFields((f) => ({ ...f, [k]: v }));

  return (
    <div data-testid={`${testIdPrefix}-builder`}>
      <div role="tablist" aria-label={label + " editor"} style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        {(["builder", "html"] as const).map((m) => (
          <button key={m} type="button" role="tab" aria-selected={mode === m} disabled={disabled}
            onClick={() => { if (m === "html") setRaw(mode === "builder" ? built : raw); setMode(m); }}
            style={{ ...pill, background: mode === m ? "var(--ui-accent-blue, #1d4ed8)" : "transparent", color: mode === m ? "#fff" : "var(--ui-text, #0f172a)", borderColor: mode === m ? "var(--ui-accent-blue, #1d4ed8)" : "var(--ui-border, #cbd6e2)" }}>
            {m === "builder" ? "Signature builder" : "Paste your own HTML (advanced)"}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ flex: "1 1 380px", minWidth: 0 }}>
          {mode === "builder" ? (
            <>
              {FIELD_ROWS.map((row, i) => (
                <div key={i} style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
                  {row.map(([k, l, ph]) => (
                    <label key={k} style={lab}>
                      {l}
                      <input aria-label={`${label} ${l}`} value={String(fields[k] ?? "")} placeholder={ph} disabled={disabled}
                        onChange={(e) => set(k, e.target.value)} style={input} />
                    </label>
                  ))}
                </div>
              ))}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 8, alignItems: "flex-end" }}>
                <label style={{ ...lab, flex: "2 1 220px" }}>
                  Logo image URL
                  <input aria-label={`${label} Logo image URL`} value={fields.logoUrl} disabled={disabled} onChange={(e) => set("logoUrl", e.target.value)} style={input} placeholder="https://..." />
                </label>
                <label style={{ ...lab, flex: "0 0 110px" }}>
                  Logo width
                  <input aria-label={`${label} Logo width`} type="number" min={60} max={200} value={fields.logoWidth} disabled={disabled} onChange={(e) => set("logoWidth", Number(e.target.value))} style={input} />
                </label>
                <label style={{ ...lab, flex: "0 0 150px" }}>
                  Brand colour
                  <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input aria-label={`${label} Brand colour picker`} type="color" value={safeColor(fields.color)} disabled={disabled} onChange={(e) => set("color", e.target.value)} style={{ width: 36, height: 30, padding: 0, border: "1px solid var(--ui-border, #cbd6e2)", borderRadius: 4 }} />
                    <input aria-label={`${label} Brand colour`} value={fields.color} disabled={disabled} onChange={(e) => set("color", e.target.value)} style={{ ...input, width: 90 }} />
                  </span>
                </label>
                <label style={{ ...lab, flex: "1 1 160px" }}>
                  Booking button text
                  <input aria-label={`${label} Booking button text`} value={fields.bookingLabel} disabled={disabled} onChange={(e) => set("bookingLabel", e.target.value)} style={input} />
                </label>
              </div>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--ui-text-muted, #475569)" }}>
                Logo and colour come from the company branding. Empty fields are left out of the signature.
              </p>
            </>
          ) : (
            <textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              rows={10}
              disabled={disabled}
              aria-label={label + " HTML"}
              placeholder="<p>Best,<br>Your Name<br>Company</p>"
              style={{ width: "100%", padding: 8, fontFamily: "monospace", fontSize: 12, borderRadius: 6, border: "1px solid var(--ui-border)", boxSizing: "border-box" }}
            />
          )}
        </div>
        <div style={{ flex: "1 1 320px", minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ui-text-muted, #475569)", marginBottom: 6 }}>Preview</div>
          {/* Always on white with dark text, the way most recipients see it, whatever the portal theme. */}
          <div data-testid={`${testIdPrefix}-preview`} style={{ background: "#FFFFFF", color: "#111827", border: "1px solid #E5E7EB", borderRadius: 8, padding: 16, overflowX: "auto" }}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(current) || "<span style=\"color:#6B7280\">Nothing to preview yet.</span>" }} />
        </div>
      </div>
    </div>
  );
}

function pickFilled(f: SignatureFields, keys: Array<keyof SignatureFields>): Partial<SignatureFields> {
  const out: Partial<SignatureFields> = {};
  for (const k of keys) if (f[k] !== "" && f[k] !== undefined) (out as Record<string, unknown>)[k] = f[k];
  return out;
}

const pill: CSSProperties = { padding: "5px 12px", borderRadius: 999, border: "1px solid", cursor: "pointer", fontSize: 13 };
const lab: CSSProperties = { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontWeight: 600, color: "var(--ui-text, #0f172a)", flex: "1 1 200px", minWidth: 0 };
const input: CSSProperties = { padding: "6px 8px", borderRadius: 6, border: "1px solid var(--ui-border, #cbd6e2)", fontSize: 13, fontWeight: 400, background: "var(--ui-surface-strong, #fff)", color: "var(--ui-text, #0f172a)" };
