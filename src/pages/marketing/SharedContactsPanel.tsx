// BF_PORTAL_SHARED_CONTACTS_v1 (2026-11-24) - Marketing > Contacts, in every silo: the shared list of brokers, lenders
// and banks across Boreal Financial, Boreal Risk Management (PGI) and Keystone (BF-Server /api/directory). Filter it,
// open a person to see where they are in each brand, import a new list (preview first), or read the silos in now.
// Importing or syncing never emails anyone.
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { api } from "@/api";
import { getErrorMessage } from "@/utils/errors";

type Brand = "BF" | "BI" | "KS";
type BrandState = { status: string; last_activity: string | null; at: string | null };
type Person = { id: string; name: string | null; email: string | null; title: string | null; kind: string; country: string | null; region: string | null; firm: string | null; sources: string[]; brands: Partial<Record<Brand, BrandState>> };
type PersonDetail = Person & {
  phone: string | null; domain: string | null; website: string | null; firm_phone: string | null; city: string | null; all_brands_opt_out: boolean; bad_address: boolean;
  brands: Array<{ brand: Brand; status: string; consent_basis: string | null; consent_source: string | null; silo_record_id: string | null; last_activity: string | null; last_activity_at: string | null }>;
};
type Preview = { rows: number; firms: number; with_email: number; people_new: number; people_on_file: number; routed: Record<Brand, number>; skipped: Array<{ row: number; error: string }> };

export const BRAND_LABEL: Record<Brand, string> = { BF: "Boreal Financial", BI: "PGI", KS: "Keystone" };
const STATUS_LABEL: Record<string, string> = { loaded: "Not contacted", opted_out: "Unsubscribed" };
const PAGE = 100;

const input: CSSProperties = { padding: "7px 9px", border: "1px solid var(--ui-border)", borderRadius: 6, fontSize: 13, background: "var(--ui-surface-strong)", color: "var(--ui-text)", minHeight: 36, boxSizing: "border-box" };
const th: CSSProperties = { textAlign: "left", padding: "8px 10px", fontSize: 12, color: "var(--ui-text-muted)", borderBottom: "1px solid var(--ui-border)", whiteSpace: "nowrap" };
const td: CSSProperties = { padding: "8px 10px", fontSize: 13, color: "var(--ui-text)", borderBottom: "1px solid var(--ui-border)", verticalAlign: "top" };

export function statusLabel(s: string | null | undefined, activity?: string | null): string {
  if (!s) return "";
  if (s === "opted_out") return "Unsubscribed";
  return activity ? activity.replace(/_/g, " ") : STATUS_LABEL[s] ?? s.replace(/_/g, " ");
}

function Chip({ brand, state }: { brand: Brand; state: BrandState }) {
  const off = state.status === "opted_out";
  return (
    <span data-testid={`chip-${brand}`} style={{ display: "inline-block", padding: "2px 8px", borderRadius: 999, fontSize: 11, marginRight: 4, marginBottom: 2, whiteSpace: "nowrap",
      border: `1px solid ${off ? "#fca5a5" : "var(--ui-border)"}`, color: off ? "#b91c1c" : "var(--ui-text)", background: "var(--ui-surface)" }}>
      {BRAND_LABEL[brand]}: {statusLabel(state.status, state.last_activity)}
    </span>
  );
}

/** A CSV (comma, tab or semicolon) into objects keyed by lower-case header. Quoted fields are handled. */
export function parseCsv(text: string): Array<Record<string, string>> {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const sep = (firstLine.match(/\t/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? "\t" : (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; continue; }
    if (c === '"') q = true;
    else if (c === sep) { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows.filter((r) => r.some((x) => x.trim()));
  if (!head) return [];
  const keys = head.map((h) => h.trim().toLowerCase());
  return body.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? "").trim()])));
}

const pick = (r: Record<string, string>, ...names: string[]) => { for (const n of names) if (r[n]) return r[n]; return ""; };

/** Spreadsheet rows into the import's companies and contacts (common header names from ZoomInfo, Apollo and our lists). */
export function rowsToList(rows: Array<Record<string, string>>) {
  const companies = new Map<string, Record<string, string>>();
  const contacts: Array<Record<string, string>> = [];
  for (const r of rows) {
    const company = pick(r, "company", "company name", "company_name", "firm", "organization", "organization name", "account name");
    if (!company) continue;
    const country = pick(r, "country", "company country", "address_country");
    const state = pick(r, "state", "province", "province_state", "province/state", "region", "company state", "address_state");
    if (!companies.has(company.toLowerCase())) companies.set(company.toLowerCase(), {
      name: company, website: pick(r, "website", "company website", "domain", "url"), phone: pick(r, "company phone", "phone (company)", "main phone"),
      address_country: country, address_state: state, address_city: pick(r, "city", "company city"), address_street: pick(r, "address", "street", "company street address"),
    });
    const first = pick(r, "first name", "first_name"), last = pick(r, "last name", "last_name");
    const name = pick(r, "name", "full name", "contact name", "contact_name") || [first, last].filter(Boolean).join(" ");
    const email = pick(r, "email", "email address", "work email", "business email");
    if (name || email) contacts.push({
      name, company_name: company, email, job_title: pick(r, "title", "job title", "job_title"),
      phone: pick(r, "direct phone", "direct_phone", "mobile phone", "phone", "mobile"), address_country: country, address_state: state,
    });
  }
  return { companies: [...companies.values()], contacts };
}

function ImportBox({ onDone }: { onDone: (msg: string) => void }) {
  const [listName, setListName] = useState("");
  const [kind, setKind] = useState<"" | "broker" | "lender" | "bank">("");
  const [only, setOnly] = useState<Brand[] | null>(null);
  const [list, setList] = useState<{ companies: unknown[]; contacts: unknown[] } | null>(null);
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const body = () => ({ list_name: listName.trim(), kind, only, ...(list ?? { companies: [], contacts: [] }) });
  const ready = !!listName.trim() && !!kind && !!list && (list.companies.length + list.contacts.length) > 0;

  async function readFile(f: File | undefined) {
    setPreview(null); setError(null);
    if (!f) return;
    if (!/\.(csv|tsv|txt)$/i.test(f.name)) { setError("Save the spreadsheet as CSV first (File > Save As > CSV), then choose it here."); return; }
    const parsed = rowsToList(parseCsv(await f.text()));
    if (!parsed.companies.length) { setError("No rows with a company name were found. The file needs a Company column."); return; }
    setFileName(f.name); setList(parsed);
  }
  async function run(previewOnly: boolean) {
    setBusy(true); setError(null);
    try {
      const r = await api.post<any>("/api/directory/import", { ...body(), preview: previewOnly });
      if (previewOnly) setPreview(r as Preview);
      else {
        onDone(`Loaded "${listName.trim()}": ${r.people_added} new, ${r.people_updated} already on file. Nobody was emailed.`);
        setPreview(null); setList(null); setFileName(""); setListName(""); setKind(""); setOnly(null);
      }
    } catch (e) { setError(getErrorMessage(e, "That did not work. Please try again.")); }
    finally { setBusy(false); }
  }
  const toggle = (b: Brand) => setOnly((cur) => { const base = cur ?? ["BF", "BI", "KS"]; const next = base.includes(b) ? base.filter((x) => x !== b) : [...base, b]; return next.length === 3 ? null : next; });

  return (
    <div data-testid="contacts-import" style={{ border: "1px solid var(--ui-border)", borderRadius: 8, padding: 14, marginBottom: 14, background: "var(--ui-surface)" }}>
      <div style={{ fontWeight: 600, marginBottom: 8, color: "var(--ui-text)" }}>Import a list</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <input style={{ ...input, minWidth: 220 }} placeholder='List name, e.g. "US lender search 4"' value={listName} onChange={(e) => setListName(e.target.value)} aria-label="List name" />
        <select style={input} value={kind} onChange={(e) => { setKind(e.target.value as typeof kind); setPreview(null); }} aria-label="What the list is">
          <option value="">What is it?</option><option value="broker">Brokers</option><option value="lender">Lenders</option><option value="bank">Banks</option>
        </select>
        <input type="file" accept=".csv,.tsv,.txt" onChange={(e) => void readFile(e.target.files?.[0])} aria-label="List file" />
      </div>
      <div style={{ fontSize: 12, color: "var(--ui-text-muted)", marginTop: 8 }}>
        Send to: {(["KS", "BI", "BF"] as Brand[]).map((b) => (
          <label key={b} style={{ marginRight: 12 }}><input type="checkbox" checked={!only || only.includes(b)} onChange={() => { toggle(b); setPreview(null); }} /> {BRAND_LABEL[b]}</label>
        ))}
        <span>(each person still only goes where the routing allows: no brokers in Boreal Financial, no Quebec in PGI)</span>
      </div>
      {fileName && list && <div style={{ fontSize: 12, marginTop: 6, color: "var(--ui-text-muted)" }}>{fileName}: {list.contacts.length} people at {list.companies.length} firms</div>}
      {preview && (
        <div data-testid="contacts-preview" style={{ marginTop: 10, fontSize: 13, color: "var(--ui-text)" }}>
          <div>{preview.with_email} people with an email: <strong>{preview.people_new} new</strong>, {preview.people_on_file} already on file. {preview.firms} firms.</div>
          <div>Goes to: Keystone {preview.routed.KS} · PGI {preview.routed.BI} · Boreal Financial {preview.routed.BF}</div>
          {preview.skipped.length > 0 && <div style={{ color: "#b45309" }}>{preview.skipped.length} rows skipped (e.g. row {preview.skipped[0]!.row}: {preview.skipped[0]!.error})</div>}
          <div style={{ color: "var(--ui-text-muted)" }}>Loading puts people in each list. Nobody is emailed; flows only start when you press Start.</div>
        </div>
      )}
      {error && <div role="alert" style={{ color: "#b91c1c", fontSize: 13, marginTop: 8 }}>{error}</div>}
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button type="button" className="ui-button ui-button--secondary" disabled={!ready || busy} onClick={() => void run(true)}>{busy && !preview ? "Checking…" : "Preview"}</button>
        <button type="button" className="ui-button ui-button--primary" disabled={!ready || !preview || busy} onClick={() => void run(false)} data-testid="contacts-import-confirm">{busy && preview ? "Loading…" : "Load the list"}</button>
      </div>
    </div>
  );
}

function PersonPanel({ id, onClose }: { id: string; onClose: () => void }) {
  const [p, setP] = useState<PersonDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setP(null); setError(null);
    api.get<{ person: PersonDetail }>(`/api/directory/people/${encodeURIComponent(id)}`).then((r) => setP(r.person)).catch((e) => setError(getErrorMessage(e, "That did not work. Please try again.")));
  }, [id]);
  return (
    <aside data-testid="contacts-person" style={{ border: "1px solid var(--ui-border)", borderRadius: 8, padding: 14, background: "var(--ui-surface)", minWidth: 280, maxWidth: 380, alignSelf: "flex-start" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong style={{ color: "var(--ui-text)" }}>{p?.name || p?.email || "Contact"}</strong>
        <button type="button" className="ui-button ui-button--secondary" onClick={onClose} aria-label="Close">Close</button>
      </div>
      {error && <div role="alert" style={{ color: "#b91c1c", fontSize: 13 }}>{error}</div>}
      {p && (
        <div style={{ fontSize: 13, color: "var(--ui-text)", marginTop: 8, lineHeight: 1.6 }}>
          <div>{[p.title, p.firm].filter(Boolean).join(", ")}</div>
          <div>{p.email}{p.phone ? ` · ${p.phone}` : ""}</div>
          <div style={{ color: "var(--ui-text-muted)" }}>{[p.kind, p.region, p.country].filter(Boolean).join(" · ")}{p.website ? ` · ${p.website}` : ""}</div>
          {(p.all_brands_opt_out || p.bad_address) && <div style={{ color: "#b91c1c" }}>{p.bad_address ? "Email address bounced: no brand emails it." : "Asked to stop all email."}</div>}
          <div style={{ fontWeight: 600, marginTop: 10 }}>By brand</div>
          {p.brands.length === 0 && <div style={{ color: "var(--ui-text-muted)" }}>Not in any brand's list yet.</div>}
          {p.brands.map((b) => (
            <div key={b.brand} style={{ borderTop: "1px solid var(--ui-border)", paddingTop: 6, marginTop: 6 }}>
              <div><strong>{BRAND_LABEL[b.brand]}</strong>: {statusLabel(b.status, b.last_activity)}{b.last_activity_at ? ` (${new Date(b.last_activity_at).toLocaleDateString()})` : ""}</div>
              {b.consent_source && <div style={{ color: "var(--ui-text-muted)", fontSize: 12 }}>Basis: {b.consent_source}</div>}
            </div>
          ))}
          <div style={{ fontWeight: 600, marginTop: 10 }}>Came from</div>
          <div style={{ color: "var(--ui-text-muted)" }}>{p.sources.join(", ") || "Unknown"}</div>
        </div>
      )}
    </aside>
  );
}

export default function SharedContactsPanel() {
  const [f, setF] = useState({ q: "", kind: "", country: "", region: "", brand: "", status: "", not_brand: "", source: "" });
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<{ total: number; people: Person[] } | null>(null);
  const [sources, setSources] = useState<Array<{ source: string; people: number }>>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(() => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(f)) if (v.trim()) q.set(k, v.trim());
    q.set("limit", String(PAGE)); q.set("offset", String(offset));
    return q.toString();
  }, [f, offset]);

  const load = useCallback(async () => {
    setError(null);
    try { setData(await api.get<{ total: number; people: Person[] }>(`/api/directory/people?${query}`)); }
    catch (e) { setError(getErrorMessage(e, "That did not work. Please try again.")); }
  }, [query]);
  useEffect(() => { const t = setTimeout(() => void load(), 250); return () => clearTimeout(t); }, [load]);
  useEffect(() => { api.get<{ sources: Array<{ source: string; people: number }> }>("/api/directory/sources").then((r) => setSources(r.sources ?? [])).catch(() => setSources([])); }, [msg]);

  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => { setOffset(0); setF((x) => ({ ...x, [k]: e.target.value })); };

  async function sync() {
    setBusy(true); setMsg(null); setError(null);
    try {
      const r = await api.post<{ results: Array<{ brand: Brand; read: number; people_added: number; error?: string }> }>("/api/directory/sync", {});
      setMsg(r.results.map((x) => x.error ? `${BRAND_LABEL[x.brand]}: ${x.error}` : `${BRAND_LABEL[x.brand]}: read ${x.read}, ${x.people_added} new`).join(" · "));
      void load();
    } catch (e) { setError(getErrorMessage(e, "That did not work. Please try again.")); }
    finally { setBusy(false); }
  }

  const total = data?.total ?? 0;
  return (
    <div data-testid="shared-contacts">
      <p style={{ fontSize: 13, color: "var(--ui-text-muted)", margin: "0 0 10px" }}>
        Every broker, lender and bank across Boreal Financial, PGI and Keystone, one row per person. Loading a list or reading the silos never emails anyone.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
        <input style={{ ...input, minWidth: 200 }} placeholder="Search name, email or firm" value={f.q} onChange={set("q")} aria-label="Search" />
        <select style={input} value={f.kind} onChange={set("kind")} aria-label="Type"><option value="">All types</option><option value="broker">Brokers</option><option value="lender">Lenders</option><option value="bank">Banks</option></select>
        <select style={input} value={f.country} onChange={set("country")} aria-label="Country"><option value="">All countries</option><option value="CA">Canada</option><option value="US">United States</option></select>
        <input style={{ ...input, width: 110 }} placeholder="Prov. / state" value={f.region} onChange={set("region")} aria-label="Province or state" />
        <select style={input} value={f.brand} onChange={set("brand")} aria-label="In brand"><option value="">Any brand</option>{(["KS", "BI", "BF"] as Brand[]).map((b) => <option key={b} value={b}>In {BRAND_LABEL[b]}</option>)}</select>
        {f.brand && <select style={input} value={f.status} onChange={set("status")} aria-label="Status"><option value="">Any status</option><option value="loaded">Not contacted</option><option value="opted_out">Unsubscribed</option></select>}
        <select style={input} value={f.not_brand} onChange={set("not_brand")} aria-label="Not in brand"><option value="">—</option>{(["KS", "BI", "BF"] as Brand[]).map((b) => <option key={b} value={b}>Not in {BRAND_LABEL[b]} yet</option>)}</select>
        <select style={{ ...input, maxWidth: 220 }} value={f.source} onChange={set("source")} aria-label="From list"><option value="">Any list</option>{sources.map((s) => <option key={s.source} value={s.source}>{s.source} ({s.people})</option>)}</select>
        <button type="button" className="ui-button ui-button--secondary" onClick={() => setImporting((x) => !x)}>{importing ? "Close import" : "Import a list"}</button>
        <button type="button" className="ui-button ui-button--secondary" disabled={busy} onClick={() => void sync()} title="Read PGI's and Keystone's broker and lender lists into this list now">{busy ? "Reading…" : "Refresh from silos"}</button>
      </div>
      {importing && <ImportBox onDone={(m) => { setMsg(m); setImporting(false); void load(); }} />}
      {msg && <div role="status" style={{ fontSize: 13, marginBottom: 8, color: "var(--ui-text)" }}>{msg}</div>}
      {error && <div role="alert" style={{ color: "#b91c1c", fontSize: 13, marginBottom: 8 }}>{error}</div>}
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        <div style={{ flex: 1, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={th}>Person</th><th style={th}>Firm</th><th style={th}>Type</th><th style={th}>Where</th><th style={th}>Brands</th></tr></thead>
            <tbody>
              {(data?.people ?? []).map((p) => (
                <tr key={p.id} onClick={() => setOpen(p.id)} style={{ cursor: "pointer", background: open === p.id ? "var(--ui-surface)" : undefined }} data-testid="contacts-row">
                  <td style={td}><div>{p.name || "—"}</div><div style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>{p.email}</div></td>
                  <td style={td}><div>{p.firm || "—"}</div><div style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>{p.title}</div></td>
                  <td style={td}>{p.kind}</td>
                  <td style={td}>{[p.region, p.country].filter(Boolean).join(", ")}</td>
                  <td style={td}>{(Object.entries(p.brands ?? {}) as Array<[Brand, BrandState]>).map(([b, s]) => <Chip key={b} brand={b} state={s} />)}</td>
                </tr>
              ))}
              {data && (data.people ?? []).length === 0 && <tr><td style={td} colSpan={5}>No one matches. Clear a filter or import a list.</td></tr>}
            </tbody>
          </table>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8, fontSize: 13, color: "var(--ui-text-muted)" }}>
            <span>{total ? `${offset + 1}–${Math.min(offset + PAGE, total)} of ${total.toLocaleString()}` : "0 people"}</span>
            <button type="button" className="ui-button ui-button--secondary" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))}>Previous</button>
            <button type="button" className="ui-button ui-button--secondary" disabled={offset + PAGE >= total} onClick={() => setOffset(offset + PAGE)}>Next</button>
          </div>
        </div>
        {open && <PersonPanel id={open} onClose={() => setOpen(null)} />}
      </div>
    </div>
  );
}
