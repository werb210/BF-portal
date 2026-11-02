// BF_PORTAL_v873_LENDER_API - Lenders > edit lender > Connection: send packages to this lender by API and pull its status,
// offers, conditions and (after funding) its balance back. Admin only. Ported from KS-Portal #47 without the plan gate.
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  apiMessage, deleteConnection, fetchConnection, fetchConnectionLog, fetchConnectors, fetchFieldKeys, rotateWebhookAddress, saveConnection, testConnection,
  type Bucket, type ConnectorInfo, type ConnectorsResponse, type StatusMapEntry,
} from "@/api/lenderConnections";

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {});
const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));

export function getIn(o: Obj, path: string): unknown {
  return path.split(".").reduce<unknown>((cur, k) => (cur && typeof cur === "object" ? (cur as Obj)[k] : undefined), o);
}
export function setIn(o: Obj, path: string, value: unknown): Obj {
  const [head, ...rest] = path.split(".");
  const next = { ...o };
  if (!rest.length) {
    if (value === "" || value === undefined) delete next[head!];
    else next[head!] = value;
    return next;
  }
  next[head!] = setIn(obj(o[head!]), rest.join("."), value);
  return next;
}

const s = {
  section: { border: "1px solid var(--ui-border)", borderRadius: 10, padding: 16, marginBottom: 14, background: "var(--ui-surface-strong)" } as const,
  h: { fontSize: 15, fontWeight: 700, color: "var(--ui-text)", margin: "0 0 10px" } as const,
  label: { fontSize: 13, fontWeight: 600, color: "var(--ui-text)", display: "block", marginBottom: 4 } as const,
  help: { fontSize: 12, color: "var(--ui-text-muted)", margin: "2px 0 8px" } as const,
  input: { width: "100%", padding: "8px 12px", border: "1px solid var(--ui-border)", borderRadius: 8, fontSize: 14, boxSizing: "border-box" as const, color: "var(--ui-text)", background: "var(--ui-surface-strong)", fontFamily: "inherit" },
  row: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 } as const,
  check: { display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--ui-text)", marginBottom: 6, cursor: "pointer" } as const,
  btn: { border: "1px solid var(--ui-border)", background: "var(--ui-surface-strong)", color: "var(--ui-text)", padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" } as const,
  primary: { border: 0, background: "var(--ui-accent-blue)", color: "#fff", padding: "9px 16px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" } as const,
  warn: { background: "#fffbeb", border: "1px solid #fde68a", color: "#78350f", borderRadius: 8, padding: "10px 12px", fontSize: 13, marginBottom: 12 } as const,
  err: { background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", borderRadius: 8, padding: "10px 12px", fontSize: 13, marginBottom: 12 } as const,
  ok: { background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#14532d", borderRadius: 8, padding: "10px 12px", fontSize: 13, marginBottom: 12 } as const,
  table: { width: "100%", borderCollapse: "collapse" as const, fontSize: 12 },
  th: { textAlign: "left" as const, padding: "6px 8px", color: "var(--ui-text-muted)", borderBottom: "1px solid var(--ui-border)", fontWeight: 600 },
  td: { padding: "6px 8px", color: "var(--ui-text)", borderBottom: "1px solid var(--ui-border-soft, var(--ui-border))", verticalAlign: "top" as const },
};

function Text({ label, path, config, onChange, placeholder, help }: { label: string; path: string; config: Obj; onChange: (c: Obj) => void; placeholder?: string; help?: string }) {
  return (
    <div>
      <label style={s.label}>{label}</label>
      <input aria-label={label} style={s.input} value={str(getIn(config, path))} placeholder={placeholder} onChange={(e) => onChange(setIn(config, path, e.target.value))} />
      {help ? <p style={s.help}>{help}</p> : null}
    </div>
  );
}

function Select({ label, path, config, onChange, options }: { label: string; path: string; config: Obj; onChange: (c: Obj) => void; options: Array<[string, string]> }) {
  return (
    <div>
      <label style={s.label}>{label}</label>
      <select aria-label={label} style={s.input} value={str(getIn(config, path)) || options[0]![0]} onChange={(e) => onChange(setIn(config, path, e.target.value))}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}

/** Lender field -> Boreal value rows. */
function FieldMapEditor({ path, config, onChange, keys, lenderFieldLabel }: { path: string; config: Obj; onChange: (c: Obj) => void; keys: Array<{ key: string; label: string }>; lenderFieldLabel: string }) {
  const map = obj(getIn(config, path));
  const rows = Object.entries(map);
  const write = (entries: Array<[string, unknown]>) => onChange(setIn(config, path, Object.fromEntries(entries.filter(([k]) => k.trim()))));
  const [newField, setNewField] = useState("");
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={s.label}>Field mapping</label>
      <p style={s.help}>Left: the lender's field name ({lenderFieldLabel}). Right: the Boreal value to send. Use "=text" for a fixed value.</p>
      <table style={s.table}>
        <thead><tr><th style={s.th}>Lender field</th><th style={s.th}>Boreal value</th><th style={s.th} /></tr></thead>
        <tbody>
          {rows.map(([field, source], i) => (
            <tr key={`${field}-${i}`}>
              <td style={s.td}><code>{field}</code></td>
              <td style={s.td}>
                <select aria-label={`Value for ${field}`} style={s.input} value={keys.some((k) => k.key === source) ? String(source) : "__fixed"}
                  onChange={(e) => write(rows.map(([f, v]) => [f, f === field ? (e.target.value === "__fixed" ? "=" : e.target.value) : v]))}>
                  {keys.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
                  <option value="__fixed">Fixed value or package field</option>
                </select>
                {!keys.some((k) => k.key === source) && (
                  <input aria-label={`Fixed value for ${field}`} style={{ ...s.input, marginTop: 4 }} value={String(source)}
                    onChange={(e) => write(rows.map(([f, v]) => [f, f === field ? e.target.value : v]))} placeholder='=CAD or field:Product Category' />
                )}
              </td>
              <td style={s.td}><button type="button" style={s.btn} onClick={() => write(rows.filter(([f]) => f !== field))}>Remove</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <input aria-label="New lender field" style={s.input} value={newField} placeholder="Lender field name" onChange={(e) => setNewField(e.target.value)} />
        <button type="button" style={s.btn} disabled={!newField.trim()} onClick={() => { write([...rows, [newField.trim(), keys[0]?.key ?? "company"]]); setNewField(""); }}>Add field</button>
      </div>
    </div>
  );
}

function StatusMapEditor({ map, onChange, buckets, stages, defaults }: { map: Record<string, StatusMapEntry>; onChange: (m: Record<string, StatusMapEntry>) => void; buckets: Array<{ key: Bucket; label: string }>; stages: string[]; defaults: Record<string, Bucket> }) {
  const [name, setName] = useState("");
  const entries = Object.entries(map);
  return (
    <div style={s.section}>
      <h4 style={s.h}>Lender statuses</h4>
      <p style={s.help}>What each of this lender's status names means in Boreal, and which pipeline stage it moves the file to. Statuses not listed use the connection's defaults, then a best guess. By default only an offer moves the file (to Offer); one lender declining never closes a file other lenders are working.</p>
      {Object.keys(defaults).length > 0 && (
        <p style={s.help}>Built-in for this lender: {Object.entries(defaults).map(([k, v]) => `${k} → ${buckets.find((b) => b.key === v)?.label ?? v}`).join("; ")}.</p>
      )}
      <table style={s.table}>
        <thead><tr><th style={s.th}>Lender status</th><th style={s.th}>Means</th><th style={s.th}>Move the file to</th><th style={s.th} /></tr></thead>
        <tbody>
          {entries.map(([k, v]) => (
            <tr key={k}>
              <td style={s.td}>{k}</td>
              <td style={s.td}>
                <select aria-label={`Meaning of ${k}`} style={s.input} value={v.bucket} onChange={(e) => onChange({ ...map, [k]: { ...v, bucket: e.target.value as Bucket } })}>
                  {buckets.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}
                </select>
              </td>
              <td style={s.td}>
                <select aria-label={`Stage for ${k}`} style={s.input} value={v.stage ?? ""} onChange={(e) => onChange({ ...map, [k]: { ...v, stage: e.target.value || null } })}>
                  <option value="">Do not move</option>
                  {stages.map((st) => <option key={st} value={st}>{st}</option>)}
                </select>
              </td>
              <td style={s.td}><button type="button" style={s.btn} onClick={() => { const n = { ...map }; delete n[k]; onChange(n); }}>Remove</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <input aria-label="New lender status" style={s.input} value={name} placeholder="Status name exactly as the lender sends it" onChange={(e) => setName(e.target.value)} />
        <button type="button" style={s.btn} disabled={!name.trim()} onClick={() => { onChange({ ...map, [name.trim().toLowerCase().replace(/\s+/g, " ")]: { bucket: "in_review", stage: null } }); setName(""); }}>Add status</button>
      </div>
    </div>
  );
}

function ConnectorSettings({ kind, config, onChange, keys, catalogue }: { kind: string; config: Obj; onChange: (c: Obj) => void; keys: Array<{ key: string; label: string }>; catalogue: ConnectorsResponse }) {
  if (kind === "heron") {
    return (
      <div style={s.section}>
        <h4 style={s.h}>Heron Data</h4>
        <p style={s.help}>Deals go to https://app.herondata.io with the broker key the funder created for you. Heron takes PDFs only and has no status read-back for brokers.</p>
        <Text label="Broker email for credit (optional)" path="source_email_address" config={config} onChange={onChange} placeholder="Defaults to the assigned staff member's email" />
      </div>
    );
  }
  if (kind === "merchant_growth") {
    const mg = catalogue.merchant_growth;
    return (
      <div style={s.section}>
        <h4 style={s.h}>Merchant Growth</h4>
        <div style={s.warn} data-testid="mg-awaiting">
          Awaiting Merchant Growth's API documentation. Their broker portal is a Salesforce site (merchantadvance.my.site.com); this connection is a Salesforce setup shaped from it, but every field name is a guess until they confirm it, so it cannot be switched on. Their packages keep going by email and Google Sheet.
        </div>
        <p style={s.label}>Ask Merchant Growth for:</p>
        <ol style={{ margin: "0 0 12px 18px", padding: 0, fontSize: 13, color: "var(--ui-text)" }}>
          {mg.requests.map((r) => <li key={r} style={{ marginBottom: 4 }}>{r}</li>)}
        </ol>
        <details>
          <summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--ui-text)" }}>Their portal's fields and what they map to ({mg.fields.length})</summary>
          <table style={{ ...s.table, marginTop: 8 }}>
            <thead><tr><th style={s.th}>Record</th><th style={s.th}>Section</th><th style={s.th}>Their field</th><th style={s.th}>Direction</th><th style={s.th}>Boreal</th></tr></thead>
            <tbody>
              {mg.fields.map((f, i) => (
                <tr key={i}><td style={s.td}>{f.object}</td><td style={s.td}>{f.section}</td><td style={s.td}>{f.label}</td><td style={s.td}>{f.direction === "send" ? "We send" : "We read"}</td><td style={s.td}>{f.boreal ?? "Not collected"}</td></tr>
              ))}
            </tbody>
          </table>
        </details>
        <p style={{ ...s.help, marginTop: 10 }}>Statuses seen on their portal: {Object.entries(mg.status_map).map(([k, v]) => `${k} → ${catalogue.buckets.find((b) => b.key === v)?.label ?? v}`).join("; ")}. Guessed: {Object.keys(mg.guessed_statuses).join(", ")}.</p>
      </div>
    );
  }
  if (kind === "salesforce") {
    return (
      <>
        <div style={s.section}>
          <h4 style={s.h}>Salesforce sign-in</h4>
          <div style={s.row}>
            <Text label="Broker portal address" path="site_url" config={config} onChange={onChange} placeholder="https://lender.my.site.com" />
            <Select label="Sign-in method" path="auth_flow" config={config} onChange={onChange} options={[["password", "User name and password"], ["client_credentials", "Client credentials"], ["jwt_bearer", "JWT (private key)"]]} />
          </div>
          <div style={s.row}>
            <Text label="API address (optional)" path="api_base_url" config={config} onChange={onChange} placeholder="Taken from the sign-in when blank" />
            <Text label="API version (optional)" path="api_version" config={config} onChange={onChange} placeholder="v60.0" />
          </div>
        </div>
        <div style={s.section}>
          <h4 style={s.h}>Creating the deal</h4>
          <Text label="Salesforce object" path="submit.object" config={config} onChange={onChange} placeholder="Lead or Application__c" help="Files in the package are attached to the new record (ContentVersion)." />
          <FieldMapEditor path="submit.field_map" config={config} onChange={onChange} keys={keys} lenderFieldLabel="the Salesforce field API name, e.g. Company or Use_of_Funds__c" />
        </div>
        <div style={s.section}>
          <h4 style={s.h}>Reading the status back</h4>
          <div style={s.row}>
            <Text label="Status field" path="status.status_field" config={config} onChange={onChange} placeholder="Status" />
            <Text label="Converted-to field (optional)" path="status.converted_field" config={config} onChange={onChange} placeholder="ConvertedOpportunityId" />
          </div>
          <div style={s.row}>
            <Text label="Then read object" path="status.follow.object" config={config} onChange={onChange} placeholder="Opportunity" />
            <Text label="Its status field" path="status.follow.status_field" config={config} onChange={onChange} placeholder="StageName" />
          </div>
          <div style={s.row}>
            <Text label="Funded amount field (optional)" path="status.follow.funded_amount_field" config={config} onChange={onChange} placeholder="Amount" />
            <Text label="Balance field (optional)" path="status.follow.balance_field" config={config} onChange={onChange} placeholder="Outstanding_Balance__c" help="After funding, the balance goes onto the file's Active Contract." />
          </div>
          <Text label="Offers query (optional)" path="status.offers_soql" config={config} onChange={onChange} placeholder="SELECT Id, Amount__c FROM Quote__c WHERE Opportunity__c = '{{record_id}}'" help="A SELECT; {{record_id}} is the record that carries the status. Map its columns in Advanced settings (status.offer_fields)." />
          <Text label="Conditions query (optional)" path="status.conditions_soql" config={config} onChange={onChange} placeholder="SELECT Id, Name, Status__c FROM Stipulation__c WHERE Opportunity__c = '{{record_id}}'" />
        </div>
        <div style={s.section}>
          <h4 style={s.h}>Pushes from the lender</h4>
          <Select label="How the lender tells us" path="webhook.mode" config={config} onChange={onChange} options={[["none", "It does not (Boreal checks on a timer)"], ["outbound_message", "Salesforce Outbound Message"], ["json", "Flow HTTP callout (JSON)"]]} />
          {str(getIn(config, "webhook.mode")) === "outbound_message" && (
            <Text label="Lender's Salesforce organization id" path="webhook.org_id" config={config} onChange={onChange} placeholder="00D..." help="Outbound Messages are not signed; Boreal checks this id and the secret in the address." />
          )}
          {str(getIn(config, "webhook.mode")) === "json" && (
            <Select label="Signature" path="webhook.signature" config={config} onChange={onChange} options={[["shared_secret_header", "Shared secret in a header"], ["hmac_sha256_hex", "HMAC-SHA256 (hex)"], ["hmac_sha256_base64", "HMAC-SHA256 (base64)"], ["none", "None (address secret only)"]]} />
          )}
          <Text label="Status field in pushes" path="webhook.status_field" config={config} onChange={onChange} placeholder="StageName" />
        </div>
      </>
    );
  }
  // generic_rest
  return (
    <>
      <div style={s.section}>
        <h4 style={s.h}>API and sign-in</h4>
        <Text label="API address" path="base_url" config={config} onChange={onChange} placeholder="https://api.lender.com" />
        <div style={s.row}>
          <Select label="Authentication" path="auth.type" config={config} onChange={onChange} options={[["bearer", "Bearer token"], ["api_key_header", "API key header"], ["basic", "User name and password"], ["none", "None"]]} />
          {str(getIn(config, "auth.type")) === "api_key_header" ? <Text label="Header name" path="auth.header_name" config={config} onChange={onChange} placeholder="X-API-Key" /> : <div />}
        </div>
      </div>
      <div style={s.section}>
        <h4 style={s.h}>Submitting a deal</h4>
        <div style={s.row}>
          <Text label="Path" path="submit.path" config={config} onChange={onChange} placeholder="/applications" />
          <Select label="Documents" path="submit.documents" config={config} onChange={onChange} options={[["inline_base64", "Inside the request (base64)"], ["upload_each", "Uploaded one by one"], ["none", "Not sent"]]} />
        </div>
        <FieldMapEditor path="submit.field_map" config={config} onChange={onChange} keys={keys} lenderFieldLabel="a JSON path, e.g. business.legal_name" />
        <div style={s.row}>
          <Text label="Deal id in the answer" path="submit.external_id_path" config={config} onChange={onChange} placeholder="id" />
          <Text label="Status in the answer (optional)" path="submit.status_path" config={config} onChange={onChange} placeholder="status" />
        </div>
        {str(getIn(config, "submit.documents")) === "upload_each" && (
          <div style={s.row}>
            <Text label="Upload path" path="upload.path" config={config} onChange={onChange} placeholder="/applications/{{external_id}}/documents" />
            <Text label="File field" path="upload.file_field" config={config} onChange={onChange} placeholder="file" />
          </div>
        )}
      </div>
      <div style={s.section}>
        <h4 style={s.h}>Reading the status back</h4>
        <Text label="Status path" path="status.path" config={config} onChange={onChange} placeholder="/applications/{{external_id}}" />
        <div style={s.row}>
          <Text label="Status field" path="status.status_path" config={config} onChange={onChange} placeholder="status" />
          <Text label="Offers list (optional)" path="status.offers_path" config={config} onChange={onChange} placeholder="offers" />
        </div>
        <div style={s.row}>
          <Text label="Conditions list (optional)" path="status.conditions_path" config={config} onChange={onChange} placeholder="stipulations" />
          <Text label="Funded amount (optional)" path="status.funded_amount_path" config={config} onChange={onChange} placeholder="funding.amount" />
        </div>
        <div style={s.row}>
          <Text label="Outstanding balance (optional)" path="status.balance_path" config={config} onChange={onChange} placeholder="balance.outstanding" help="After funding, Boreal keeps checking once a day and records the balance on the file's Active Contract." />
          <Text label="Balance date (optional)" path="status.balance_as_of_path" config={config} onChange={onChange} placeholder="balance.as_of" />
        </div>
      </div>
      <div style={s.section}>
        <h4 style={s.h}>Webhooks from the lender</h4>
        <div style={s.row}>
          <Select label="Signature" path="webhook.signature" config={config} onChange={onChange} options={[["none", "None (address secret only)"], ["hmac_sha256_hex", "HMAC-SHA256 (hex)"], ["hmac_sha256_base64", "HMAC-SHA256 (base64)"], ["shared_secret_header", "Shared secret in a header"]]} />
          <Text label="Signature header" path="webhook.signature_header" config={config} onChange={onChange} placeholder="X-Signature" />
        </div>
        <div style={s.row}>
          <Text label="Deal id in the webhook" path="webhook.external_id_path" config={config} onChange={onChange} placeholder="id" />
          <Text label="Status in the webhook" path="webhook.status_path" config={config} onChange={onChange} placeholder="status" />
        </div>
      </div>
    </>
  );
}

export function LenderConnectionPanel({ lenderId, lenderName }: { lenderId: string; lenderName: string }) {
  const qc = useQueryClient();
  const catalogue = useQuery({ queryKey: ["lender-connectors"], queryFn: fetchConnectors });
  const fieldKeys = useQuery({ queryKey: ["lender-connector-keys"], queryFn: fetchFieldKeys });
  const current = useQuery({ queryKey: ["lender-connection", lenderId], queryFn: () => fetchConnection(lenderId) });
  const log = useQuery({ queryKey: ["lender-connection-log", lenderId], queryFn: () => fetchConnectionLog(lenderId), enabled: Boolean(current.data?.connection) });

  const [kind, setKind] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [submitByApi, setSubmitByApi] = useState(true);
  const [emailFallback, setEmailFallback] = useState(true);
  const [pollEnabled, setPollEnabled] = useState(true);
  const [pollMinutes, setPollMinutes] = useState(30);
  const [config, setConfig] = useState<Obj>({});
  const [statusMap, setStatusMap] = useState<Record<string, StatusMapEntry>>({});
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [advanced, setAdvanced] = useState("");
  const [advancedError, setAdvancedError] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState<string | null>(null);

  useEffect(() => {
    const c = current.data?.connection;
    if (!current.data) return;
    if (c) {
      setKind(c.connector); setEnabled(c.enabled); setSubmitByApi(c.submit_by_api); setEmailFallback(c.email_fallback);
      setPollEnabled(c.poll_enabled); setPollMinutes(c.poll_interval_minutes); setConfig(c.config ?? {}); setStatusMap(c.status_map ?? {});
      setWebhookUrl(c.webhook_url ?? null);
    } else {
      const mg = /merchant\s*growth/i.test(lenderName);
      setKind(mg ? "merchant_growth" : "generic_rest");
      // A new Merchant Growth connection starts from the Salesforce preset shaped from their portal.
      if (mg && catalogue.data) setConfig(JSON.parse(JSON.stringify(catalogue.data.merchant_growth.preset)) as Obj);
    }
  }, [current.data, lenderName, catalogue.data]);

  const fromAdvanced = useRef(false);
  useEffect(() => {
    if (fromAdvanced.current) { fromAdvanced.current = false; return; }
    setAdvanced(JSON.stringify(config, null, 2)); setAdvancedError(null);
  }, [config]);

  const connector: ConnectorInfo | undefined = useMemo(() => catalogue.data?.connectors.find((c) => c.kind === kind), [catalogue.data, kind]);
  const awaiting = connector?.availability === "awaiting_lender_api_docs";
  const saved = current.data?.connection ?? null;

  const choose = (k: string) => {
    setKind(k);
    if (k === "merchant_growth" && catalogue.data && !Object.keys(config).length) setConfig(JSON.parse(JSON.stringify(catalogue.data.merchant_growth.preset)) as Obj);
    if (k !== saved?.connector) setEnabled(false);
  };

  async function save() {
    setBusy("save"); setMsg(null);
    try {
      const body = {
        connector: kind, enabled: awaiting ? false : enabled, submit_by_api: submitByApi, email_fallback: emailFallback, poll_enabled: pollEnabled,
        poll_interval_minutes: pollMinutes, config, status_map: statusMap,
        secrets: Object.fromEntries(Object.entries(secrets).filter(([, v]) => v.trim())),
      };
      const r = await saveConnection(lenderId, body);
      setSecrets({});
      setWebhookUrl(r.connection?.webhook_url ?? null);
      setMsg({ tone: "ok", text: r.problems?.length ? `Saved, switched off. Still to fix: ${r.problems.join(" ")}` : "Connection saved." });
      await qc.invalidateQueries({ queryKey: ["lender-connection", lenderId] });
    } catch (err) {
      setMsg({ tone: "err", text: apiMessage(err, "Could not save the connection.") });
    } finally { setBusy(null); }
  }

  async function test() {
    setBusy("test"); setMsg(null);
    try {
      const r = await testConnection(lenderId);
      setMsg({ tone: r.test.ok ? "ok" : "err", text: r.test.message });
    } catch (err) {
      setMsg({ tone: "err", text: apiMessage(err, "The test could not run. Save the connection first.") });
    } finally { setBusy(null); }
  }

  async function rotate() {
    if (!window.confirm("Make a new webhook address? The old one stops working at once; give the lender the new one.")) return;
    setBusy("rotate");
    try { setWebhookUrl((await rotateWebhookAddress(lenderId)).webhook_url); } catch (err) { setMsg({ tone: "err", text: apiMessage(err, "Could not make a new address.") }); } finally { setBusy(null); }
  }

  async function remove() {
    if (!window.confirm(`Remove the API connection to ${lenderName}? Packages go back to email; the history stays.`)) return;
    setBusy("delete");
    try { await deleteConnection(lenderId); await qc.invalidateQueries({ queryKey: ["lender-connection", lenderId] }); setMsg({ tone: "ok", text: "Connection removed." }); }
    catch (err) { setMsg({ tone: "err", text: apiMessage(err, "Could not remove the connection.") }); } finally { setBusy(null); }
  }

  if (catalogue.isLoading || current.isLoading) return <p style={{ color: "var(--ui-text-muted)", fontSize: 14 }}>Loading…</p>;
  if (catalogue.error || current.error || !catalogue.data) return <div style={s.err}>{apiMessage(catalogue.error ?? current.error, "The connection settings could not be loaded.")}</div>;
  const cat = catalogue.data;
  const keys = fieldKeys.data?.keys ?? [];

  return (
    <div data-testid="lender-connection-tab">
      <p style={{ ...s.help, fontSize: 13 }}>
        Send {lenderName}'s packages through the lender's broker API and pull status, offers and conditions back automatically. Email stays the fallback. Use your own broker API key or portal credentials from {lenderName}.
      </p>
      {!cat.credentials_key_configured && <div style={s.warn}>Credentials cannot be saved yet: the server's LENDER_CREDENTIALS_ENCRYPTION_KEY setting is missing. Add it to BF-Server in Azure, then come back.</div>}
      {msg && <div role="status" style={msg.tone === "ok" ? s.ok : s.err}>{msg.text}</div>}

      <div style={s.section}>
        <label style={s.label}>Connection type</label>
        <select aria-label="Connection type" style={s.input} value={kind} onChange={(e) => choose(e.target.value)}>
          {cat.connectors.map((c) => <option key={c.kind} value={c.kind}>{c.label}</option>)}
        </select>
        {connector && <p style={s.help}>{connector.description}</p>}
        {connector && (
          <p style={s.help}>
            Can: {[connector.capabilities.submit && "submit", connector.capabilities.status && "read status", connector.capabilities.upload && "send more documents", connector.capabilities.webhook && "receive webhooks"].filter(Boolean).join(", ")}.
          </p>
        )}
        <label style={{ ...s.check, opacity: awaiting ? 0.6 : 1 }}>
          <input type="checkbox" checked={enabled && !awaiting} disabled={awaiting} onChange={(e) => setEnabled(e.target.checked)} />
          Connection on
        </label>
        <label style={s.check}><input type="checkbox" checked={submitByApi} onChange={(e) => setSubmitByApi(e.target.checked)} />Send packages by API when staff press Send (otherwise only with Submit by API)</label>
        <label style={s.check}><input type="checkbox" checked={emailFallback} onChange={(e) => setEmailFallback(e.target.checked)} />If the API refuses or is down, email the package instead</label>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label style={{ ...s.check, marginBottom: 0 }}><input type="checkbox" checked={pollEnabled} onChange={(e) => setPollEnabled(e.target.checked)} />Check for updates every</label>
          <input aria-label="Minutes between checks" type="number" min={5} max={1440} style={{ ...s.input, width: 90 }} value={pollMinutes} onChange={(e) => setPollMinutes(Number(e.target.value) || 30)} />
          <span style={{ fontSize: 14, color: "var(--ui-text)" }}>minutes</span>
        </div>
      </div>

      <ConnectorSettings kind={kind} config={config} onChange={setConfig} keys={keys} catalogue={cat} />

      {connector && connector.secret_fields.length > 0 && (
        <div style={s.section}>
          <h4 style={s.h}>Credentials</h4>
          <p style={s.help}>Stored encrypted. Leave a box blank to keep what is saved.</p>
          {connector.secret_fields.map((f) => (
            <div key={f.key} style={{ marginBottom: 8 }}>
              <label style={s.label}>{f.label}{f.required ? " *" : ""}{saved?.secret_hints?.[f.key] ? <span style={{ fontWeight: 400, color: "var(--ui-text-muted)" }}> (saved, {saved.secret_hints[f.key]})</span> : null}</label>
              {f.key === "private_key"
                ? <textarea aria-label={f.label} rows={3} style={s.input} value={secrets[f.key] ?? ""} onChange={(e) => setSecrets((p) => ({ ...p, [f.key]: e.target.value }))} />
                : <input aria-label={f.label} type="password" autoComplete="new-password" style={s.input} value={secrets[f.key] ?? ""} onChange={(e) => setSecrets((p) => ({ ...p, [f.key]: e.target.value }))} />}
              {f.help ? <p style={s.help}>{f.help}</p> : null}
            </div>
          ))}
        </div>
      )}

      <StatusMapEditor map={statusMap} onChange={setStatusMap} buckets={cat.buckets} stages={cat.stages} defaults={connector?.default_status_map ?? {}} />

      <details style={s.section}>
        <summary style={{ cursor: "pointer", fontSize: 14, fontWeight: 600, color: "var(--ui-text)" }}>Advanced settings (JSON)</summary>
        <p style={s.help}>Every setting, for fields the form above does not show (offer and condition field names, extra headers, static fields).</p>
        <textarea aria-label="Advanced settings" rows={12} style={{ ...s.input, fontFamily: "ui-monospace, monospace", fontSize: 12 }} value={advanced}
          onChange={(e) => { setAdvanced(e.target.value); try { const v = JSON.parse(e.target.value); if (v && typeof v === "object" && !Array.isArray(v)) { fromAdvanced.current = true; setConfig(v); setAdvancedError(null); } else setAdvancedError("Must be a JSON object."); } catch { setAdvancedError("Not valid JSON yet."); } }} />
        {advancedError && <p style={{ ...s.help, color: "#991b1b" }}>{advancedError}</p>}
      </details>

      {saved && webhookUrl && connector?.capabilities.webhook && !awaiting && (
        <div style={s.section}>
          <h4 style={s.h}>Webhook address for {lenderName}</h4>
          <p style={s.help}>Give this address to the lender. It contains a secret: treat it like a password.</p>
          <code style={{ display: "block", wordBreak: "break-all", fontSize: 12, padding: 8, background: "var(--ui-surface-muted, var(--ui-surface-strong))", color: "var(--ui-text)", borderRadius: 6 }}>{webhookUrl}</code>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button type="button" style={s.btn} onClick={() => void navigator.clipboard?.writeText(webhookUrl)}>Copy</button>
            <button type="button" style={s.btn} disabled={busy !== null} onClick={() => void rotate()}>New address</button>
          </div>
        </div>
      )}

      {saved && (
        <div style={s.section}>
          <h4 style={s.h}>Activity</h4>
          <p style={s.help}>
            {saved.last_test_at ? `Last test ${new Date(saved.last_test_at).toLocaleString()}: ${saved.last_test_message ?? ""}. ` : ""}
            {saved.last_sync_at ? `Last update from the lender ${new Date(saved.last_sync_at).toLocaleString()}. ` : ""}
            {saved.last_error ? `Last problem: ${saved.last_error}` : ""}
          </p>
          {(log.data?.submissions ?? []).length === 0 ? <p style={s.help}>Nothing sent by API yet.</p> : (
            <table style={s.table} data-testid="lender-connection-log">
              <thead><tr><th style={s.th}>Application</th><th style={s.th}>Sent</th><th style={s.th}>State</th><th style={s.th}>Lender status</th><th style={s.th}>Problem</th></tr></thead>
              <tbody>
                {(log.data?.submissions ?? []).map((r) => (
                  <tr key={r.id}>
                    <td style={s.td}>{r.application_name ?? r.application_id}</td>
                    <td style={s.td}>{r.submitted_at ? new Date(r.submitted_at).toLocaleString() : "—"}</td>
                    <td style={s.td}>{r.status}{r.attempts > 1 ? ` (${r.attempts} tries)` : ""}</td>
                    <td style={s.td}>{r.lender_status ?? "—"}</td>
                    <td style={s.td}>{r.last_error ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
        {saved && <button type="button" style={s.btn} disabled={busy !== null} onClick={() => void remove()}>Remove connection</button>}
        {saved && <button type="button" style={s.btn} disabled={busy !== null} onClick={() => void test()}>{busy === "test" ? "Testing…" : "Test connection"}</button>}
        <button type="button" style={s.primary} disabled={busy !== null || Boolean(advancedError)} onClick={() => void save()}>{busy === "save" ? "Saving…" : "Save connection"}</button>
      </div>
    </div>
  );
}

export default function LenderConnectionTab({ lenderId, lenderName }: { lenderId: string; lenderName: string }) {
  return <LenderConnectionPanel lenderId={lenderId} lenderName={lenderName} />;
}
