// BF_PORTAL_v865_KS_MARKETING - shared pieces of the Keystone prospect screens: the "can email / blocked" badge, the
// consent editor (type, source, date, expiry, wording) and the pasted-list parser for imports.
import { KsOpsError } from "../ksApi";
import { Field, input } from "../ksUi";
import { BLOCK_LABELS, CONSENT_LABELS, KS_CONSENT_TYPES, type ConsentInput, type Eligibility } from "./ksMarketingApi";

export function EligibilityBadge({ e }: { e?: Eligibility }) {
  if (!e) return null;
  return e.ok ? (
    <span style={{ background: "#15803d", color: "#ffffff", borderRadius: 999, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>Can email</span>
  ) : (
    <span title={e.message} style={{ background: "#b91c1c", color: "#ffffff", borderRadius: 999, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>
      Blocked: {BLOCK_LABELS[e.reason] ?? e.reason}
    </span>
  );
}

export const fieldError = (err: unknown, k: string) =>
  err instanceof KsOpsError && err.fieldErrors[k] ? <span style={{ color: "var(--ui-text-danger)", fontWeight: 400 }}>{err.fieldErrors[k]}</span> : null;

export const today = () => new Date().toISOString().slice(0, 10);

/** Consent type, where it came from, the wording shown, when it was given and (implied) when it runs out. */
export function ConsentEditor({ value, onChange, error, prefix = "consent." }: { value: ConsentInput; onChange: (v: ConsentInput) => void; error?: unknown; prefix?: string }) {
  const set = (k: keyof ConsentInput) => (e: { target: { value: string } }) => onChange({ ...value, [k]: e.target.value });
  const implied = value.consent_type.startsWith("implied");
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }} data-testid="ks-mkt-consent">
      <Field name="Consent">
        <select style={input} value={value.consent_type} onChange={set("consent_type")} aria-label="Consent type">
          {KS_CONSENT_TYPES.map((c) => (
            <option key={c} value={c}>{CONSENT_LABELS[c]}</option>
          ))}
        </select>
      </Field>
      {value.consent_type !== "none" ? (
        <>
          <Field name="Where it came from">
            <input style={input} value={value.consent_source ?? ""} onChange={set("consent_source")} placeholder="Form, call, email, trade show..." aria-label="Consent source" />
            {fieldError(error, `${prefix}consent_source`)}
          </Field>
          <Field name="Date given">
            <input type="date" style={input} value={(value.consent_at ?? "").slice(0, 10)} onChange={set("consent_at")} aria-label="Consent date" />
            {fieldError(error, `${prefix}consent_at`)}
          </Field>
          {implied ? (
            <Field name="Expires (blank = the default)">
              <input type="date" style={input} value={(value.consent_expires_at ?? "").slice(0, 10)} onChange={set("consent_expires_at")} aria-label="Consent expiry" />
            </Field>
          ) : null}
          <Field name="Wording they agreed to (optional)">
            <input style={input} value={value.consent_text ?? ""} onChange={set("consent_text")} />
          </Field>
        </>
      ) : null}
    </div>
  );
}

export function cleanConsent(c: ConsentInput): ConsentInput {
  const out: ConsentInput = { consent_type: c.consent_type };
  if (c.consent_source?.trim()) out.consent_source = c.consent_source.trim();
  if (c.consent_text?.trim()) out.consent_text = c.consent_text.trim();
  if (c.consent_at) out.consent_at = new Date(c.consent_at).toISOString();
  if (c.consent_expires_at) out.consent_expires_at = new Date(c.consent_expires_at).toISOString();
  return out;
}

/** "email, name, company, country, province, plan" per line (a header row is skipped). */
export function parseImport(text: string): Array<Record<string, string>> {
  const cols = ["email", "name", "company", "country", "province_state", "plan_interest"];
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.split(/[,\t]/).map((c) => c.trim().replace(/^"|"$/g, "")))
    .filter((cells) => cells[0] && cells[0].includes("@"))
    .map((cells) => {
      const row: Record<string, string> = {};
      cols.forEach((c, i) => {
        const v = cells[i];
        if (v) row[c] = c === "country" || c === "province_state" ? v.toUpperCase() : c === "plan_interest" ? v.toLowerCase() : v;
      });
      return row;
    });
}
