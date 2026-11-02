// BF_PORTAL_v875_API_KEYS (ported from KS-Portal ApiSettings, plan gate removed) - Settings > API keys (Admins). Per silo
// (the topbar silo): create a key with a name, the permissions it needs (read or write per area) and a requests-per-minute
// limit (a new key is shown once - only a hash is kept); change a key's permissions or limit; see when and from where it
// was last used; revoke it. Then the REST API's reference: endpoints with the permission each needs, examples and the
// OpenAPI description at a stable address.
import { useState, type CSSProperties, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api";
import { API_BASE } from "@/config/api";
import { useSilo } from "@/hooks/useSilo";

export type ApiKeyRow = {
  id: string; name: string; silo: string; scopes: string[]; key_prefix: string; rate_limit_per_minute: number;
  created_by: string | null; created_at: string; last_used_at: string | null; last_used_ip: string | null; revoked_at: string | null;
};
export type KeysBody = {
  silo: string; keys: ApiKeyRow[]; scopes: Array<{ scope: string; label: string }>;
  limits: { active_keys: number; default_rate_limit: number; max_rate_limit: number }; configured: boolean;
};

export const API_KEYS_KEY = ["settings", "api-keys"] as const;
export const PUBLIC_API_PATH = "/api/open/v1";
const AREAS: Array<{ area: string; label: string }> = [
  { area: "contacts", label: "Contacts" },
  { area: "companies", label: "Companies" },
  { area: "applications", label: "Applications" },
  { area: "notes", label: "Application notes" },
  { area: "offers", label: "Lender offers" },
  { area: "lenders", label: "Lenders" },
];

const card: CSSProperties = { padding: 16, border: "1px solid var(--ui-border)", borderRadius: 12, background: "var(--ui-surface-strong)", color: "var(--ui-text)", marginBottom: 16, maxWidth: 960 };
const h3: CSSProperties = { margin: "0 0 8px", fontSize: 16, color: "var(--ui-text)" };
const h4: CSSProperties = { margin: "14px 0 6px", fontSize: 14, color: "var(--ui-text)" };
const text: CSSProperties = { margin: "0 0 10px", fontSize: 13, lineHeight: 1.5, color: "var(--ui-text)" };
const label: CSSProperties = { display: "block", fontSize: 13, fontWeight: 600, color: "var(--ui-text)", marginBottom: 4 };
const input: CSSProperties = { padding: "8px 10px", borderRadius: 8, border: "1px solid var(--ui-border)", background: "var(--ui-surface)", color: "var(--ui-text)", fontSize: 13, boxSizing: "border-box" };
const button: CSSProperties = { padding: "8px 16px", borderRadius: 8, border: "1px solid #1d4ed8", background: "#1d4ed8", color: "#ffffff", fontSize: 14, fontWeight: 600, cursor: "pointer" };
const quiet: CSSProperties = { padding: "5px 10px", borderRadius: 8, border: "1px solid var(--ui-border)", background: "var(--ui-surface-strong)", color: "var(--ui-text)", fontSize: 12, fontWeight: 600, cursor: "pointer" };
const danger: CSSProperties = { ...quiet, border: "1px solid #b91c1c", background: "#b91c1c", color: "#ffffff" };
const cell: CSSProperties = { padding: "7px 10px", borderTop: "1px solid var(--ui-border)", fontSize: 13, color: "var(--ui-text)", textAlign: "left", verticalAlign: "top" };
const mono: CSSProperties = { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12 };
const pre: CSSProperties = { ...mono, margin: "0 0 10px", padding: 10, borderRadius: 8, background: "#0f172a", color: "#f8fafc", overflowX: "auto", whiteSpace: "pre", lineHeight: 1.5 };
const secretBox: CSSProperties = { padding: 12, borderRadius: 10, background: "#fef3c7", color: "#78350f", border: "1px solid #f59e0b", marginTop: 12 };
const errorBox: CSSProperties = { marginTop: 10, padding: "8px 10px", borderRadius: 8, background: "#fee2e2", color: "#7f1d1d", fontSize: 13 };
const notice: CSSProperties = { margin: "6px 0 10px", padding: "8px 10px", borderRadius: 8, background: "#fef3c7", color: "#78350f", fontSize: 13 };

const errText = (e: unknown, fallback: string) => (e instanceof Error && e.message && e.message !== "API_ERROR" ? e.message : fallback);
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "Never");

/** "contacts:read" + "contacts:write" -> "Contacts: read and write". */
export function describeScopes(scopes: string[]): string {
  const parts: string[] = [];
  for (const a of AREAS) {
    const read = scopes.includes(`${a.area}:read`);
    const write = scopes.includes(`${a.area}:write`);
    if (write) parts.push(`${a.label}: read and write`);
    else if (read) parts.push(`${a.label}: read`);
  }
  return parts.join("; ") || "None";
}

/** The permission grid: per area, None / Read / Read and write (only where the API can write). */
function ScopePicker({ available, value, onChange, idPrefix }: { available: string[]; value: string[]; onChange: (v: string[]) => void; idPrefix: string }) {
  const level = (area: string) => (value.includes(`${area}:write`) ? "write" : value.includes(`${area}:read`) ? "read" : "none");
  const setLevel = (area: string, next: string) => {
    const rest = value.filter((s) => !s.startsWith(`${area}:`));
    if (next === "read") rest.push(`${area}:read`);
    if (next === "write") rest.push(`${area}:read`, `${area}:write`);
    onChange(rest);
  };
  return (
    <fieldset style={{ border: "1px solid var(--ui-border)", borderRadius: 8, padding: 10, margin: 0 }}>
      <legend style={{ ...label, padding: "0 4px", margin: 0 }}>Permissions</legend>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 8 }}>
        {AREAS.filter((a) => available.includes(`${a.area}:read`)).map((a) => (
          <div key={a.area}>
            <label htmlFor={`${idPrefix}-${a.area}`} style={{ ...label, fontWeight: 500 }}>{a.label}</label>
            <select id={`${idPrefix}-${a.area}`} style={{ ...input, width: "100%" }} value={level(a.area)} onChange={(e) => setLevel(a.area, e.target.value)}>
              <option value="none">No access</option>
              <option value="read">Read</option>
              {available.includes(`${a.area}:write`) ? <option value="write">Read and write</option> : null}
            </select>
          </div>
        ))}
      </div>
    </fieldset>
  );
}

function KeysCard({ siloName }: { siloName: string }) {
  const qc = useQueryClient();
  const keys = useQuery({ queryKey: [...API_KEYS_KEY, siloName], queryFn: () => api.get<KeysBody>("/api/api-keys") });
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>(["contacts:read"]);
  const [limit, setLimit] = useState("");
  const [created, setCreated] = useState<{ key: ApiKeyRow; secret: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [editScopes, setEditScopes] = useState<string[]>([]);
  const [editLimit, setEditLimit] = useState("");
  const refresh = () => { void qc.invalidateQueries({ queryKey: API_KEYS_KEY }); };

  const create = useMutation({
    mutationFn: (body: { name: string; scopes: string[]; rate_limit_per_minute?: number }) => api.post<{ key: ApiKeyRow; secret: string }>("/api/api-keys", body),
    onSuccess: (r) => { setCreated(r); setCopied(false); setName(""); setLimit(""); refresh(); },
  });
  const update = useMutation({
    mutationFn: (v: { id: string; scopes: string[]; rate_limit_per_minute: number }) =>
      api.patch<{ key: ApiKeyRow }>(`/api/api-keys/${encodeURIComponent(v.id)}`, { scopes: v.scopes, rate_limit_per_minute: v.rate_limit_per_minute }),
    onSuccess: () => { setEditing(null); refresh(); },
  });
  const revoke = useMutation({
    mutationFn: (id: string) => api.delete(`/api/api-keys/${encodeURIComponent(id)}`),
    onSuccess: refresh,
  });

  const body = keys.data;
  const available = (body?.scopes ?? []).map((s) => s.scope);
  const onCreate = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !scopes.length) return;
    create.mutate({ name: name.trim(), scopes, ...(limit.trim() ? { rate_limit_per_minute: Number(limit) } : {}) });
  };
  const onRevoke = (k: ApiKeyRow) => {
    const yes = typeof window === "undefined" ? true : window.confirm(`Revoke "${k.name}"? Anything using it stops working straight away.`);
    if (yes) revoke.mutate(k.id);
  };
  const onCopy = async () => {
    if (!created) return;
    try { await navigator.clipboard.writeText(created.secret); setCopied(true); } catch { setCopied(false); }
  };

  const rows = body?.keys ?? [];
  return (
    <section style={card} aria-labelledby="api-keys-h" data-testid="api-keys">
      <h3 id="api-keys-h" style={h3}>API keys for {siloName}</h3>
      <p style={text}>
        A key lets another system read, and where you allow it change, {siloName} records through Boreal&rsquo;s REST API. It only
        ever sees {siloName}; switch the silo at the top to manage another silo&rsquo;s keys. Give each key only the permissions it
        needs, and treat it like a password. Creating, changing and revoking keys, and every change made with a key, is recorded in
        the audit log.
      </p>
      {body && !body.configured ? <p style={notice}>API keys are not set up on the server yet.</p> : null}
      <form onSubmit={onCreate} aria-label="New API key">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end", marginBottom: 10 }}>
          <div>
            <label htmlFor="api-key-name" style={label}>Key name</label>
            <input id="api-key-name" style={{ ...input, width: 240 }} value={name} maxLength={80} placeholder="e.g. Zapier, Accounting sync" onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label htmlFor="api-key-limit" style={label}>Requests per minute</label>
            <input id="api-key-limit" type="number" min={1} max={body?.limits.max_rate_limit ?? 600} style={{ ...input, width: 120 }} value={limit}
              placeholder={String(body?.limits.default_rate_limit ?? 120)} onChange={(e) => setLimit(e.target.value)} />
          </div>
        </div>
        {available.length ? <ScopePicker available={available} value={scopes} onChange={setScopes} idPrefix="new-scope" /> : null}
        <div style={{ marginTop: 10 }}>
          <button type="submit" style={button} disabled={!name.trim() || !scopes.length || create.isPending}>{create.isPending ? "Creating…" : "Create key"}</button>
        </div>
      </form>
      {create.isError ? <p style={errorBox} role="alert">{errText(create.error, "Could not create the key.")}</p> : null}
      {created ? (
        <div style={secretBox} role="status" data-testid="api-key-secret">
          <p style={{ margin: "0 0 6px", fontWeight: 700, fontSize: 14 }}>Copy &ldquo;{created.key.name}&rdquo; now. You won&rsquo;t see this key again.</p>
          <p style={{ ...mono, margin: "0 0 8px", wordBreak: "break-all", fontSize: 13 }}>{created.secret}</p>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" style={{ ...quiet, background: "#ffffff", color: "#78350f", border: "1px solid #b45309" }} onClick={() => void onCopy()}>{copied ? "Copied" : "Copy key"}</button>
            <button type="button" style={{ ...quiet, background: "#ffffff", color: "#78350f", border: "1px solid #b45309" }} onClick={() => setCreated(null)}>I&rsquo;ve saved it</button>
          </div>
        </div>
      ) : null}
      {keys.isError ? <p style={errorBox} role="alert">{errText(keys.error, "Could not load the API keys.")}</p> : null}
      {revoke.isError ? <p style={errorBox} role="alert">{errText(revoke.error, "Could not revoke the key.")}</p> : null}
      {update.isError ? <p style={errorBox} role="alert">{errText(update.error, "Could not save the key.")}</p> : null}
      <div style={{ overflowX: "auto", marginTop: 14 }}>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              {["Name", "Key", "Permissions", "Limit", "Created", "Last used", ""].map((h) => (
                <th key={h} style={{ ...cell, borderTop: "none", fontWeight: 700 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {keys.isLoading ? (
              <tr><td style={cell} colSpan={7}>Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td style={cell} colSpan={7}>No API keys yet.</td></tr>
            ) : rows.map((k) => (
              <tr key={k.id} data-testid={`api-key-row-${k.id}`}>
                <td style={cell}>{k.name}</td>
                <td style={{ ...cell, ...mono }}>{k.key_prefix}…</td>
                <td style={{ ...cell, minWidth: 220 }}>
                  {editing === k.id ? (
                    <>
                      <ScopePicker available={available} value={editScopes} onChange={setEditScopes} idPrefix={`edit-${k.id}`} />
                      <label htmlFor={`edit-limit-${k.id}`} style={{ ...label, marginTop: 8 }}>Requests per minute</label>
                      <input id={`edit-limit-${k.id}`} type="number" min={1} max={body?.limits.max_rate_limit ?? 600} style={{ ...input, width: 120 }} value={editLimit} onChange={(e) => setEditLimit(e.target.value)} />
                    </>
                  ) : describeScopes(k.scopes)}
                </td>
                <td style={cell}>{k.rate_limit_per_minute}/min</td>
                <td style={cell}>{when(k.created_at)}</td>
                <td style={cell}>{when(k.last_used_at)}{k.last_used_ip ? <div style={{ ...mono, color: "var(--ui-text-muted)" }}>{k.last_used_ip}</div> : null}</td>
                <td style={{ ...cell, whiteSpace: "nowrap" }}>
                  {k.revoked_at ? (
                    <span>Revoked {when(k.revoked_at)}</span>
                  ) : editing === k.id ? (
                    <div style={{ display: "flex", gap: 6 }}>
                      <button type="button" style={button} disabled={!editScopes.length || update.isPending}
                        onClick={() => update.mutate({ id: k.id, scopes: editScopes, rate_limit_per_minute: Number(editLimit) })}>Save</button>
                      <button type="button" style={quiet} onClick={() => setEditing(null)}>Cancel</button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: 6 }}>
                      <button type="button" style={quiet} onClick={() => { setEditing(k.id); setEditScopes(k.scopes); setEditLimit(String(k.rate_limit_per_minute)); }} aria-label={`Change ${k.name}`}>Change</button>
                      <button type="button" style={danger} disabled={revoke.isPending} onClick={() => onRevoke(k)} aria-label={`Revoke ${k.name}`}>Revoke</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export const ENDPOINTS: Array<{ method: string; path: string; what: string; scope: string }> = [
  { method: "GET", path: "/me", what: "The key you are using: silo, permissions and limit", scope: "-" },
  { method: "GET", path: "/contacts", what: "List contacts (?q= name or email, ?email=)", scope: "contacts:read" },
  { method: "GET", path: "/contacts/{id}", what: "One contact", scope: "contacts:read" },
  { method: "POST", path: "/contacts", what: "Create a contact: first_name, last_name, email, phone, company_id, job_title", scope: "contacts:write" },
  { method: "PATCH", path: "/contacts/{id}", what: "Update first_name, last_name, email, phone, job_title, lead_status", scope: "contacts:write" },
  { method: "GET", path: "/companies", what: "List companies (?q=)", scope: "companies:read" },
  { method: "GET", path: "/companies/{id}", what: "One company", scope: "companies:read" },
  { method: "POST", path: "/companies", what: "Create a company: name, legal_name, website, email, phone, industry, city, province, country", scope: "companies:write" },
  { method: "PATCH", path: "/companies/{id}", what: "Update a company (same fields)", scope: "companies:write" },
  { method: "GET", path: "/applications", what: "List applications with their stage (?stage=)", scope: "applications:read" },
  { method: "GET", path: "/applications/{id}", what: "One application with its stage", scope: "applications:read" },
  { method: "PATCH", path: "/applications/{id}/stage", what: "Move to another stage: { \"stage\": \"In Review\" } (the usual stage rules apply)", scope: "applications:write" },
  { method: "GET", path: "/applications/{id}/notes", what: "An application's notes", scope: "notes:read" },
  { method: "POST", path: "/applications/{id}/notes", what: "Add a note: { \"body\": \"...\" }", scope: "notes:write" },
  { method: "GET", path: "/applications/{id}/offers", what: "An application's lender offers", scope: "offers:read" },
  { method: "GET", path: "/lenders", what: "List lenders (?active=true)", scope: "lenders:read" },
  { method: "GET", path: "/lenders/{id}", what: "One lender", scope: "lenders:read" },
];

export function ApiDocs({ base = `${API_BASE}${PUBLIC_API_PATH}` }: { base?: string }) {
  const openapi = `${base}/openapi.json`;
  return (
    <section style={card} aria-labelledby="api-docs-h" data-testid="api-docs">
      <h3 id="api-docs-h" style={h3}>REST API</h3>
      <p style={text}>Base address: <span style={mono}>{base}</span></p>
      <p style={text}>
        Send the key on every request as <span style={mono}>Authorization: Bearer bf_live_…</span>. Answers are JSON. Lists are
        paged with <span style={mono}>limit</span> (1–100, default 25) and <span style={mono}>offset</span>; use{" "}
        <span style={mono}>pagination.next_offset</span> for the next page (null on the last). Errors look like{" "}
        <span style={mono}>{`{ "error": { "code": "...", "message": "..." } }`}</span>: 401 bad or revoked key, 403 the key does not
        have the permission the endpoint needs, 404 not found (or another silo&rsquo;s record), 429 the key&rsquo;s requests-per-minute
        limit was reached (wait the Retry-After seconds).
      </p>
      <p style={text}>
        OpenAPI description (for Postman, Zapier and code generators):{" "}
        <a href={openapi} target="_blank" rel="noreferrer" style={{ color: "var(--ui-text)", fontWeight: 600, textDecoration: "underline" }}>{openapi}</a>
      </p>
      <h4 style={h4}>Endpoints</h4>
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead><tr>{["", "Path", "What it does", "Permission"].map((h) => <th key={h} style={{ ...cell, borderTop: "none", fontWeight: 700 }}>{h}</th>)}</tr></thead>
          <tbody>
            {ENDPOINTS.map((e) => (
              <tr key={`${e.method} ${e.path}`}>
                <td style={{ ...cell, ...mono, fontWeight: 700, whiteSpace: "nowrap" }}>{e.method}</td>
                <td style={{ ...cell, ...mono, whiteSpace: "nowrap" }}>{e.path}</td>
                <td style={cell}>{e.what}</td>
                <td style={{ ...cell, ...mono, whiteSpace: "nowrap" }}>{e.scope}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h4 style={h4}>Examples</h4>
      <pre style={pre}>{`# The first 25 contacts
curl -H "Authorization: Bearer $BOREAL_API_KEY" \\
  "${base}/contacts?limit=25"

# Applications waiting on documents
curl -H "Authorization: Bearer $BOREAL_API_KEY" \\
  "${base}/applications?stage=Documents%20Required"

# Move an application to In Review (applications: read and write)
curl -X PATCH -H "Authorization: Bearer $BOREAL_API_KEY" -H "Content-Type: application/json" \\
  -d '{"stage":"In Review"}' \\
  "${base}/applications/APPLICATION_ID/stage"

# Add a note to an application (application notes: read and write)
curl -X POST -H "Authorization: Bearer $BOREAL_API_KEY" -H "Content-Type: application/json" \\
  -d '{"body":"Spoke with the client; statements to follow."}' \\
  "${base}/applications/APPLICATION_ID/notes"`}</pre>
      <p style={text}>Stages: Received, In Review, Documents Required, Additional Steps Required, Off to Lender, Offer, Accepted, Funded, Rejected.</p>
    </section>
  );
}

export default function ApiKeysSettings() {
  const { silo } = useSilo();
  const siloName = String(silo ?? "BF").toUpperCase();
  return (
    <div data-testid="api-settings">
      <KeysCard siloName={siloName} />
      <ApiDocs />
    </div>
  );
}
