// BF_PORTAL_v945_KS_OUTREACH - Keystone silo > Marketing > Brokerages: the firms Keystone is sold to. The list (Keep /
// Research / Review / Removed, best first), the list import (Excel or CSV, sent in batches so a long list works), and
// the brokerage page: details, who to contact first, log a touch through any channel, tracked links.
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { openDialer } from "@/dialer/store";
import { Badge, Button, date, ErrorBox, Field, input, KeyValues, linkStyle, Loading, Section, Table, td } from "../../ksUi";
import { CONSENT_LABELS } from "../ksMarketingApi";
import { readListFile, type ListRows } from "./listFile";
import { dollarsToCents, OUTCOME_LABELS, outreachApi, QUALIFICATION_HELP, QUALIFICATION_LABELS, type Brokerage, type ImportResult, type Person } from "./outreachApi";

const BASE = "/silo/ks/marketing/brokerages";
const BATCH = 500;
const QUALS = ["keep", "research", "review", "remove"] as const;

export function ImportList({ onDone }: { onDone: () => void }) {
  const [file, setFile] = useState<ListRows | null>(null);
  const [fileName, setFileName] = useState("");
  const [consent, setConsent] = useState("none");
  const [consentSource, setConsentSource] = useState("");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<unknown>(null);

  const choose = async (f: File | undefined) => {
    setResult(null); setError(null); setFile(null);
    if (!f) return;
    setFileName(f.name);
    try { setFile(await readListFile(f)); } catch { setFile({ rows: [], columns: [], unknown: [], error: "That file could not be read. Save it as .xlsx or .csv and try again." }); }
  };
  const run = async () => {
    if (!file?.rows.length) return;
    setError(null); setResult(null);
    const total: ImportResult = { rows: 0, brokerages_added: 0, brokerages_updated: 0, people_added: 0, people_updated: 0, prospects_linked: 0, excluded: 0, skipped: [] };
    try {
      for (let i = 0; i < file.rows.length; i += BATCH) {
        setProgress({ done: i, total: file.rows.length });
        const r = await outreachApi.importRows(file.rows.slice(i, i + BATCH), consent === "none" ? null : { consent_type: consent, consent_source: consentSource || undefined });
        (["rows", "brokerages_added", "brokerages_updated", "people_added", "people_updated", "prospects_linked", "excluded"] as const).forEach((k) => { total[k] += r[k]; });
        total.skipped.push(...r.skipped.map((s) => ({ row: s.row + i, error: s.error })));
      }
      setResult(total);
      onDone();
    } catch (e) { setError(e); } finally { setProgress(null); }
  };
  const firms = file ? new Set(file.rows.map((r) => r.company_id || r.company)).size : 0;
  return (
    <Section title="Import a list">
      <p style={{ margin: "0 0 10px", fontSize: 13, color: "var(--ui-text-muted)" }}>
        Excel or CSV, one person per row, with a Company column. Firms already here are updated, not doubled. Firms marked Removed stay out.
      </p>
      <input type="file" accept=".xlsx,.csv" aria-label="List file" onChange={(e) => void choose(e.target.files?.[0])} />
      {file?.error ? <p role="alert" style={{ color: "#b91c1c", fontSize: 13 }}>{file.error}</p> : null}
      {file && !file.error ? (
        <div style={{ marginTop: 10, fontSize: 13 }} data-testid="import-preview">
          <p style={{ margin: "0 0 8px" }}><strong>{fileName}</strong>: {file.rows.length.toLocaleString()} people at {firms.toLocaleString()} firms.
            {file.unknown.length ? ` Columns not used: ${file.unknown.join(", ")}.` : ""}
            {!file.columns.includes("address_line1") ? " No mailing address column, so these firms cannot get letters yet." : ""}
            {!file.columns.includes("employee_count") ? " No employee count column." : ""}</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
            <Field name="Consent to email these people">
              <select aria-label="Consent" style={{ ...input, width: 360 }} value={consent} onChange={(e) => setConsent(e.target.value)}>
                <option value="none">None recorded (they cannot be emailed yet)</option>
                <option value="implied_publication">{CONSENT_LABELS.implied_publication}</option>
                <option value="us_opt_out">{CONSENT_LABELS.us_opt_out}</option>
                <option value="express">{CONSENT_LABELS.express}</option>
              </select>
            </Field>
            {consent !== "none" ? <Field name="Where the consent comes from"><input aria-label="Consent source" style={{ ...input, width: 320 }} value={consentSource} onChange={(e) => setConsentSource(e.target.value)} placeholder="e.g. published on each firm's team page" /></Field> : null}
            <Button kind="primary" testId="import-run" disabled={!!progress || !file.rows.length} onClick={() => void run()}>{progress ? `Importing ${progress.done.toLocaleString()} of ${progress.total.toLocaleString()}…` : "Import"}</Button>
          </div>
        </div>
      ) : null}
      {error ? <ErrorBox error={error} /> : null}
      {result ? (
        <div role="status" style={{ marginTop: 10, fontSize: 13 }} data-testid="import-result">
          Added {result.brokerages_added.toLocaleString()} firms and {result.people_added.toLocaleString()} people; updated {result.brokerages_updated.toLocaleString()} firms and {result.people_updated.toLocaleString()} people.
          {result.excluded ? ` Left out ${result.excluded.toLocaleString()} rows at removed firms.` : ""}
          {result.skipped.length ? ` Skipped ${result.skipped.length}: ${result.skipped.slice(0, 5).map((s) => `row ${s.row} (${s.error})`).join("; ")}${result.skipped.length > 5 ? "…" : ""}` : ""}
        </div>
      ) : null}
    </Section>
  );
}

export default function KsBrokerages() {
  const qc = useQueryClient();
  const [qual, setQual] = useState<string>("keep");
  const [q, setQ] = useState("");
  const [country, setCountry] = useState("");
  const [has, setHas] = useState("");
  const [page, setPage] = useState(0);
  const [importing, setImporting] = useState(false);
  const list = useQuery({ queryKey: ["ks-outreach", "brokerages", qual, q, country, has, page], queryFn: () => outreachApi.brokerages({ qualification: qual, q: q || undefined, countries: country || undefined, has: has || undefined, limit: 100, offset: page * 100 }) });
  const counts = list.data?.counts ?? {};
  return (
    <div data-testid="ks-brokerages">
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        {QUALS.map((k) => (
          <button key={k} type="button" aria-pressed={qual === k} title={QUALIFICATION_HELP[k]} onClick={() => { setQual(k); setPage(0); }}
            style={{ padding: "6px 12px", borderRadius: 999, border: "1px solid var(--ui-border)", fontWeight: 600, fontSize: 13, cursor: "pointer", background: qual === k ? "var(--ui-surface-strong)" : "transparent", color: "var(--ui-text)" }}>
            {QUALIFICATION_LABELS[k]} ({(counts[k] ?? 0).toLocaleString()})
          </button>
        ))}
        <input aria-label="Search brokerages" placeholder="Search name or website" style={{ ...input, width: 220 }} value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} />
        <select aria-label="Country" style={{ ...input, width: 130 }} value={country} onChange={(e) => { setCountry(e.target.value); setPage(0); }}><option value="">All countries</option><option value="CA">Canada</option><option value="US">United States</option></select>
        <select aria-label="Show only" style={{ ...input, width: 210 }} value={has} onChange={(e) => { setHas(e.target.value); setPage(0); }}><option value="">Everything</option><option value="owner">With an owner on file</option><option value="callable">With a number to call</option><option value="address">With a mailing address</option></select>
        <Button onClick={() => setImporting((v) => !v)}>{importing ? "Close import" : "Import a list"}</Button>
      </div>
      <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--ui-text-muted)" }}>{QUALIFICATION_HELP[qual]}</p>
      {importing ? <ImportList onDone={() => void qc.invalidateQueries({ queryKey: ["ks-outreach"] })} /> : null}
      {list.isLoading ? <Loading what="brokerages" /> : list.error ? <ErrorBox error={list.error} /> : (
        <>
          <Table head={["Priority", "Brokerage", "Where", "Staff", "People", "Tools today", "Last touch"]} empty={!list.data?.brokerages.length}>
            {list.data?.brokerages.map((b) => (
              <tr key={b.id} data-testid={`brokerage-${b.id}`}>
                <td style={td} title={(b.fit_reasons ?? []).join("\n")}><strong>{b.fit_score}</strong></td>
                <td style={td}><Link to={`${BASE}/${b.id}`} style={linkStyle}>{b.name}</Link>{b.status !== "working" ? <> <Badge value={b.status} /></> : null}</td>
                <td style={td}>{[b.city, b.province_state, b.country].filter(Boolean).join(", ") || "—"}</td>
                <td style={td}>{b.employee_count ?? "—"}</td>
                <td style={td}>{b.people ?? 0}{b.owners ? ` (${b.owners} owner${b.owners === 1 ? "" : "s"})` : ""}</td>
                <td style={td}>{b.current_tools?.length ? b.current_tools.join(", ") : "—"}</td>
                <td style={td}>{b.last_touch_at ? date(b.last_touch_at) : "Never"}</td>
              </tr>
            ))}
          </Table>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10, fontSize: 13 }}>
            <Button disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <span>{list.data && list.data.total ? `${(page * 100 + 1).toLocaleString()} to ${Math.min((page + 1) * 100, list.data.total).toLocaleString()} of ${list.data.total.toLocaleString()}` : "None"}</span>
            <Button disabled={!list.data || (page + 1) * 100 >= list.data.total} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </>
      )}
    </div>
  );
}

function phoneCell(p: Person, firm: string) {
  const one = (num: string | null, dnc: boolean, kind: string) => !num ? null : dnc
    ? <div key={kind} style={{ color: "#b91c1c" }}>{num} (do not call)</div>
    : <div key={kind}><button type="button" style={{ ...linkStyle, background: "none", border: 0, padding: 0, cursor: "pointer" }} onClick={() => openDialer({ phone: num, contactName: `${p.name} (${firm})`, source: "ks_outreach" })}>{num}</button> <span style={{ color: "var(--ui-text-muted)" }}>{kind}</span></div>;
  return <>{one(p.direct_phone, p.direct_dnc, "direct")}{one(p.mobile_phone, p.mobile_dnc, "mobile")}{!p.direct_phone && !p.mobile_phone ? "—" : null}</>;
}

export function LogTouch({ brokerageId, people, channels, onDone, fixedChannel }: { brokerageId?: string; people?: Person[]; channels: Array<{ key: string; name: string }>; onDone: () => void; fixedChannel?: string }) {
  const [f, setF] = useState({ channel_key: fixedChannel ?? "phone", person_id: "", outcome: "sent", summary: "", cost: "" });
  const save = useMutation({
    mutationFn: () => outreachApi.addTouch({ channel_key: f.channel_key, brokerage_id: brokerageId ?? null, person_id: f.person_id || null, outcome: f.outcome, summary: f.summary || null, cost_cents: dollarsToCents(f.cost), direction: f.outcome === "reply" ? "in" : "out" }),
    onSuccess: () => { setF({ ...f, summary: "", cost: "", outcome: "sent" }); onDone(); },
  });
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
      {fixedChannel ? null : <Field name="Channel"><select aria-label="Channel" style={{ ...input, width: 200 }} value={f.channel_key} onChange={(e) => setF({ ...f, channel_key: e.target.value })}>{channels.map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}</select></Field>}
      {people?.length ? <Field name="Who"><select aria-label="Who" style={{ ...input, width: 200 }} value={f.person_id} onChange={(e) => setF({ ...f, person_id: e.target.value })}><option value="">The firm</option>{people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field> : null}
      <Field name="What happened"><select aria-label="What happened" style={{ ...input, width: 250 }} value={f.outcome} onChange={(e) => setF({ ...f, outcome: e.target.value })}>{Object.entries(OUTCOME_LABELS).filter(([k]) => k !== "click").map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
      <Field name="Note"><input aria-label="Note" style={{ ...input, width: 280 }} value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} /></Field>
      <Field name="Cost ($)"><input aria-label="Cost" style={{ ...input, width: 90 }} value={f.cost} onChange={(e) => setF({ ...f, cost: e.target.value })} /></Field>
      <Button kind="primary" testId="touch-save" disabled={save.isPending} onClick={() => save.mutate()}>Log it</Button>
      {save.error ? <ErrorBox error={save.error} /> : null}
    </div>
  );
}

export function KsBrokerageDetail() {
  const { id = "" } = useParams();
  const qc = useQueryClient();
  const d = useQuery({ queryKey: ["ks-outreach", "brokerage", id], queryFn: () => outreachApi.brokerage(id), enabled: !!id });
  const meta = useQuery({ queryKey: ["ks-outreach", "meta"], queryFn: outreachApi.meta, staleTime: 600_000 });
  const channels = useQuery({ queryKey: ["ks-outreach", "channels"], queryFn: outreachApi.channels });
  const refresh = () => void qc.invalidateQueries({ queryKey: ["ks-outreach"] });
  const [edit, setEdit] = useState<Record<string, string> | null>(null);
  const [link, setLink] = useState({ channel_key: "mail", target_url: "", label: "" });
  const [made, setMade] = useState<string | null>(null);
  const save = useMutation({ mutationFn: (body: Record<string, unknown>) => outreachApi.saveBrokerage(id, body), onSuccess: () => { setEdit(null); refresh(); } });
  const person = useMutation({ mutationFn: (v: { id: string; body: Record<string, unknown> }) => outreachApi.savePerson(v.id, v.body), onSuccess: refresh });
  const addLink = useMutation({ mutationFn: () => outreachApi.addLink({ ...link, brokerage_id: id, label: link.label || null }), onSuccess: (r) => { setMade(r.url); setLink({ ...link, target_url: "", label: "" }); refresh(); } });
  if (d.isLoading) return <Loading what="brokerage" />;
  if (d.error || !d.data) return <ErrorBox error={d.error ?? new Error("Not found")} />;
  const b: Brokerage = d.data.brokerage;
  const startEdit = () => setEdit({
    employee_count: b.employee_count ? String(b.employee_count) : "", current_tools: (b.current_tools ?? []).join(", "), website: b.website ?? "", address_line1: b.address_line1 ?? "",
    city: b.city ?? "", province_state: b.province_state ?? "", postal_code: b.postal_code ?? "", firm_type: b.firm_type ?? "", notes: b.notes ?? "", assigned_to: b.assigned_to ?? "",
  });
  const submitEdit = () => {
    if (!edit) return;
    const staffText = (edit.employee_count ?? "").trim();
    const n = Number(staffText);
    save.mutate({
      employee_count: staffText && Number.isFinite(n) && n >= 1 ? Math.round(n) : null, current_tools: (edit.current_tools ?? "").split(",").map((s) => s.trim()).filter(Boolean),
      website: edit.website || null, address_line1: edit.address_line1 || null, city: edit.city || null, province_state: edit.province_state || null, postal_code: edit.postal_code || null,
      firm_type: edit.firm_type || null, notes: edit.notes || null, assigned_to: edit.assigned_to || null,
    });
  };
  const e = (k: string, labelText: string, width = 220) => <Field name={labelText}><input aria-label={labelText} style={{ ...input, width }} value={edit?.[k] ?? ""} onChange={(ev) => setEdit({ ...(edit ?? {}), [k]: ev.target.value })} /></Field>;
  return (
    <div data-testid="ks-brokerage-detail">
      <p style={{ margin: "0 0 8px" }}><Link to={BASE} style={linkStyle}>All brokerages</Link></p>
      <h2 style={{ margin: "0 0 4px", fontSize: 20 }}>{b.name} <Badge value={QUALIFICATION_LABELS[b.qualification] ?? b.qualification} /></h2>
      <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--ui-text-muted)" }}>{b.qualification_reason}{b.qualification_locked ? " (set by staff)" : ""}</p>
      <Section title="The firm" actions={edit ? undefined : <Button onClick={startEdit}>Edit</Button>}>
        {edit ? (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
            {e("employee_count", "Staff", 80)}{e("current_tools", "Tools they use today (comma separated)", 320)}{e("website", "Website")}{e("address_line1", "Mailing address", 260)}{e("city", "City", 150)}{e("province_state", "Province or state", 110)}{e("postal_code", "Postal or zip code", 120)}
            <Field name="Kind of firm"><select aria-label="Kind of firm" style={{ ...input, width: 320 }} value={edit.firm_type ?? ""} onChange={(ev) => setEdit({ ...edit, firm_type: ev.target.value })}><option value="">Not classified yet</option>{(meta.data?.firm_types ?? []).filter((t) => t.key !== "unknown").map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}</select></Field>
            {e("assigned_to", "Owned by", 150)}{e("notes", "Notes", 360)}
            <Button kind="primary" testId="firm-save" disabled={save.isPending} onClick={submitEdit}>Save</Button><Button onClick={() => setEdit(null)}>Cancel</Button>
          </div>
        ) : (
          <KeyValues rows={[
            ["Priority", <span key="p" title={(b.fit_reasons ?? []).join("\n")}><strong>{b.fit_score}</strong> of 100: {(b.fit_reasons ?? []).join("; ") || "nothing on file yet"}</span>],
            ["Where", [b.address_line1, b.city, b.province_state, b.postal_code, b.country].filter(Boolean).join(", ") || "No address on file"],
            ["Staff", b.employee_count ?? "Not known"], ["Tools they use today", b.current_tools?.length ? b.current_tools.join(", ") : "Not known: ask on the first call"],
            ["Website", b.website ? <a key="w" href={b.website} target="_blank" rel="noreferrer" style={linkStyle}>{b.website}</a> : "—"], ["Owned by", b.assigned_to ?? "—"], ["Notes", b.notes ?? "—"],
          ]} />
        )}
        {save.error ? <ErrorBox error={save.error} /> : null}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12, alignItems: "center", fontSize: 13 }}>
          <span>Qualification:</span>
          {QUALS.map((k) => <Button key={k} kind={b.qualification === k ? "primary" : "secondary"} testId={`qual-${k}`} onClick={() => save.mutate({ qualification: k })}>{QUALIFICATION_LABELS[k]}</Button>)}
          {b.qualification_locked ? <Button onClick={() => save.mutate({ unlock_qualification: true })}>Let the rules decide</Button> : null}
          <span style={{ marginLeft: 12 }}>Outreach:</span>
          {(["working", "parked", "customer"] as const).map((s) => <Button key={s} kind={b.status === s ? "primary" : "secondary"} onClick={() => save.mutate({ status: s })}>{s === "working" ? "Working" : s === "parked" ? "Parked" : "Customer"}</Button>)}
        </div>
      </Section>
      <Section title="People (who to contact first)">
        <Table head={["Name", "Title", "Email", "Phone", ""]} empty={!d.data.people.length}>
          {d.data.people.map((p) => (
            <tr key={p.id}>
              <td style={td}>{p.name}{p.is_owner ? <> <Badge value="Owner" /></> : null}{p.needs_review ? <> <Badge value="Role unclear" /></> : null}</td>
              <td style={td}>{p.title ?? "—"}</td>
              <td style={td}>{p.email ? (p.prospect_id ? <Link to={`/silo/ks/marketing/prospects/${p.prospect_id}`} style={linkStyle}>{p.email}</Link> : p.email) : "No email"}</td>
              <td style={td}>{phoneCell(p, b.name)}</td>
              <td style={td}><Button onClick={() => person.mutate({ id: p.id, body: { direct_dnc: !(p.direct_dnc && p.mobile_dnc), mobile_dnc: !(p.direct_dnc && p.mobile_dnc) } })}>{p.direct_dnc && p.mobile_dnc ? "Allow calls" : "Do not call"}</Button></td>
            </tr>
          ))}
        </Table>
      </Section>
      <Section title="Log a touch">
        <LogTouch brokerageId={id} people={d.data.people} channels={channels.data?.channels ?? []} onDone={refresh} />
      </Section>
      <Section title="History">
        <Table head={["When", "Channel", "What happened", "Who", "Note", "By"]} empty={!d.data.touches.length}>
          {d.data.touches.map((t) => (
            <tr key={t.id}><td style={td}>{date(t.at, true)}</td><td style={td}>{channels.data?.channels.find((c) => c.key === t.channel_key)?.name ?? t.channel_key}</td><td style={td}>{OUTCOME_LABELS[t.outcome] ?? t.outcome}</td><td style={td}>{t.person_name ?? "—"}</td><td style={td}>{t.summary ?? (t.item_name ?? "—")}</td><td style={td}>{t.created_by ?? "—"}</td></tr>
          ))}
        </Table>
      </Section>
      <Section title="Tracked links for this firm">
        <p style={{ margin: "0 0 8px", fontSize: 13, color: "var(--ui-text-muted)" }}>Use one on a letter's QR code, in a message or on a gift. A click shows in the history above and on the channel's scoreboard.</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
          <Field name="Channel"><select aria-label="Link channel" style={{ ...input, width: 200 }} value={link.channel_key} onChange={(ev) => setLink({ ...link, channel_key: ev.target.value })}>{(channels.data?.channels ?? []).map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}</select></Field>
          <Field name="Goes to"><input aria-label="Goes to" style={{ ...input, width: 320 }} placeholder="https://" value={link.target_url} onChange={(ev) => setLink({ ...link, target_url: ev.target.value })} /></Field>
          <Field name="Label"><input aria-label="Link label" style={{ ...input, width: 180 }} value={link.label} onChange={(ev) => setLink({ ...link, label: ev.target.value })} /></Field>
          <Button kind="primary" disabled={addLink.isPending || !link.target_url} onClick={() => addLink.mutate()}>Make link</Button>
        </div>
        {addLink.error ? <ErrorBox error={addLink.error} /> : null}
        {made ? <p role="status" style={{ fontSize: 13 }}>New link: <code>{made}</code></p> : null}
        {d.data.links.length ? <Table head={["Label", "Channel", "Goes to", "Clicks", "Last click"]}>{d.data.links.map((l) => <tr key={l.code}><td style={td}>{l.label ?? l.code}</td><td style={td}>{l.channel_key}</td><td style={td}>{l.target_url}</td><td style={td}>{l.clicks}</td><td style={td}>{l.last_click_at ? date(l.last_click_at, true) : "—"}</td></tr>)}</Table> : null}
      </Section>
    </div>
  );
}
