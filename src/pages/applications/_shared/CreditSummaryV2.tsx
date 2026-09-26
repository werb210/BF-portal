// BF_PORTAL_BLOCK_v539_CREDIT_SUMMARY_V2 - the new credit summary (server v535-v538).
import { useCallback, useEffect, useState } from "react";
import { rawApiFetch } from "@/api";
import { OVERVIEW_ROWS, ROW_LABELS, bulletsToText, cell, money, risksToText, textToBullets, textToRisks, type Section, type SummaryRow } from "./creditSummaryV2Helpers";

const card = { border: "1px solid #e2e8f0", borderRadius: 8, padding: 16, marginBottom: 16, background: "#fff" } as const;
const btn = { padding: "6px 12px", marginRight: 8, marginBottom: 8 } as const;
const th = { textAlign: "left", padding: "4px 8px", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" } as const;
const td = { padding: "4px 8px", borderBottom: "1px solid #f1f5f9", verticalAlign: "top" } as const;

async function call(path: string, method = "GET", body?: unknown): Promise<any> {
  const response = await rawApiFetch(path, { method, body: body === undefined ? undefined : JSON.stringify(body) });
  const json: any = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json?.message ?? json?.error ?? `Request failed (${response.status})`);
  return json?.data ?? json;
}

function SectionEditor({ sec, disabled, onSave }: { sec: Section; disabled: boolean; onSave: (body: unknown) => Promise<void> }) {
  const initial = sec.key === "rationale" ? bulletsToText(sec.bullets) : sec.key === "risks" ? risksToText(sec.risks) : sec.text;
  const [value, setValue] = useState(initial);
  const [editing, setEditing] = useState(false);
  useEffect(() => setValue(initial), [initial]);
  const save = async () => {
    const body = sec.key === "rationale" ? { bullets: textToBullets(value) } : sec.key === "risks" ? { risks: textToRisks(value) } : { text: value };
    await onSave(body);
    setEditing(false);
  };
  return <div style={card} data-testid={`cs2-section-${sec.key}`}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <h3 style={{ margin: 0 }}>{sec.title}{sec.edited && <small style={{ color: "#64748b" }}> (edited)</small>}</h3>
      {!disabled && !editing && <button type="button" style={btn} onClick={() => setEditing(true)}>Edit</button>}
    </div>
    {editing ? <div>
      {sec.key === "rationale" && <small>One reason per line.</small>}
      {sec.key === "risks" && <small>One per line: risk | mitigant</small>}
      <textarea aria-label={`${sec.title} text`} value={value} onChange={(event) => setValue(event.target.value)} rows={Math.max(4, value.split("\n").length + 1)} style={{ width: "100%", fontFamily: "inherit" }} />
      <button type="button" style={btn} onClick={() => void save()}>Save</button>
      <button type="button" style={btn} onClick={() => { setValue(initial); setEditing(false); }}>Cancel</button>
    </div> : sec.key === "rationale" ? <ul>{(sec.bullets ?? []).map((item) => <li key={item}>{item}</li>)}</ul>
      : sec.key === "risks" ? <table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr><th style={th}>Risk</th><th style={th}>Mitigant</th></tr></thead><tbody>{(sec.risks ?? []).map((item) => <tr key={item.risk}><td style={td}>{item.risk}</td><td style={td}>{item.mitigant}</td></tr>)}</tbody></table>
        : <div style={{ whiteSpace: "pre-wrap" }}>{sec.text || <em style={{ color: "#94a3b8" }}>Nothing written yet.</em>}</div>}
  </div>;
}

export default function CreditSummaryV2({ applicationId }: { applicationId: string }) {
  const id = encodeURIComponent(applicationId);
  const [row, setRow] = useState<SummaryRow>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [table, setTable] = useState<Record<string, string>>({});
  const [editingTable, setEditingTable] = useState(false);
  const load = useCallback(async () => {
    try { const json = await call(`/api/credit-summary-v2/${id}`); setRow(json?.summary ?? null); } catch { /* Retain the currently rendered data. */ }
  }, [id]);
  useEffect(() => { void load(); }, [load]);
  const run = async (label: string, path: string, method = "POST", body?: unknown, done?: (json: any) => string) => {
    setBusy(label); setMessage(null);
    try {
      const json = await call(path, method, body);
      if (json?.summary !== undefined) setRow(json.summary);
      setMessage(done ? done(json) : `${label}: done.`);
    } catch (error) { setMessage(`${label}: ${(error as Error).message}`); } finally { setBusy(null); }
  };
  const doc = row?.doc;
  const submitted = row?.status === "submitted";
  const saveSection = (key: string) => async (body: unknown) => run("Save", `/api/credit-summary-v2/${id}/sections/${key}`, "PUT", body, () => "Saved.");
  const setFact = (factId: string, status: "confirmed" | "rejected") => run(status === "confirmed" ? "Confirm" : "Reject", `/api/credit-research/${id}/facts/${encodeURIComponent(factId)}`, "PUT", { status }, () => status === "confirmed" ? "Confirmed - Generate again to use it." : "Removed.");

  return <div data-testid="credit-summary-v2" style={{ maxWidth: 1000 }}>
    <div style={card}>
      <div style={{ display: "flex", flexWrap: "wrap" }}>
        <button type="button" style={btn} disabled={!!busy} onClick={() => void run("Read financials", `/api/credit-financials/${id}/extract`, "POST", undefined, (json) => `Read ${json?.documents ?? 0} financial document(s).${json?.skipped?.length ? ` Skipped: ${json.skipped.join("; ")}` : ""}`)}>Read financials</button>
        <button type="button" style={btn} disabled={!!busy} onClick={() => void run("Read collateral", `/api/credit-collateral/${id}/extract`, "POST", undefined, (json) => `Read ${json?.documents ?? 0} aging / equipment / real-estate document(s).${json?.skipped?.length ? ` Skipped: ${json.skipped.join("; ")}` : ""}`)}>Read A/R, equipment &amp; real estate</button>
        <button type="button" style={btn} disabled={!!busy} onClick={() => void run("Research", `/api/credit-research/${id}/refresh`, "POST", undefined, (json) => `Found ${json?.facts ?? 0} fact(s).${json?.notes?.length ? ` ${json.notes.join(" ")}` : ""}`)}>Research company</button>
        <button type="button" style={{ ...btn, fontWeight: 600 }} disabled={!!busy} data-testid="cs2-generate" onClick={() => void run("Generate", `/api/credit-summary-v2/${id}/generate`, "POST", undefined, () => "Draft ready - review each section.")}>{doc ? "Generate again" : "Generate credit summary"}</button>
        {doc && !submitted && <button type="button" style={btn} disabled={!!busy} data-testid="cs2-submit" onClick={() => { if (window.confirm("Submit this credit summary? It will be signed with your name.")) void run("Submit", `/api/credit-summary-v2/${id}/submit`, "POST", undefined, () => "Submitted."); }}>Submit</button>}
      </div>
      {busy && <div>{busy}... this can take up to a minute.</div>}{message && <div role="status">{message}</div>}
      <div style={{ color: "#475569" }}>Order: read financials and collateral, run research, then generate. Staff edits are kept when you generate again.</div>
    </div>
    {!doc ? <div style={card}>No credit summary yet.</div> : <>
      <div style={card} data-testid="cs2-status">
        {submitted ? <strong>Submitted by {row?.submitted_by_name ?? "staff"} on {row?.submitted_at ? new Date(row.submitted_at).toLocaleString() : ""}. Editing or generating again returns it to draft.</strong> : <strong>Draft</strong>}
        {!!doc.missing.length && <><h4>Still missing</h4><ul data-testid="cs2-missing">{doc.missing.map((item) => <li key={item}>{item}</li>)}</ul></>}
        {!!doc.warnings.length && <><h4 style={{ color: "#b45309" }}>Check these figures</h4><ul data-testid="cs2-warnings">{doc.warnings.map((item) => <li key={item}>{item}</li>)}</ul></>}
      </div>
      {!!doc.unverifiedResearch.length && <div style={card} data-testid="cs2-unverified"><h4>Web and registry facts to check (not used until confirmed)</h4><table style={{ width: "100%", borderCollapse: "collapse" }}><tbody>{doc.unverifiedResearch.map((fact) => <tr key={fact.id}><td style={td}><strong>{fact.label}</strong>: {fact.value} {fact.url && <a href={fact.url} target="_blank" rel="noreferrer">source</a>}</td><td style={{ ...td, whiteSpace: "nowrap" }}><button type="button" style={btn} onClick={() => void setFact(fact.id, "confirmed")}>Confirm</button><button type="button" style={btn} onClick={() => void setFact(fact.id, "rejected")}>Reject</button></td></tr>)}</tbody></table></div>}
      <div style={card} data-testid="cs2-overview">
        <div style={{ display: "flex", justifyContent: "space-between" }}><h3 style={{ margin: 0 }}>Application Overview</h3>{!editingTable ? <button type="button" style={btn} onClick={() => { setTable(Object.fromEntries(OVERVIEW_ROWS.map(([key]) => [key, doc.overview[key] ?? ""]))); setEditingTable(true); }}>Edit</button> : <span><button type="button" style={btn} onClick={() => void run("Save", `/api/credit-summary-v2/${id}/sections/overview_table`, "PUT", table, () => "Saved.").then(() => setEditingTable(false))}>Save</button><button type="button" style={btn} onClick={() => setEditingTable(false)}>Cancel</button></span>}</div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}><tbody>{OVERVIEW_ROWS.map(([key, label]) => <tr key={key}><th style={{ ...th, width: 240 }}>{label}</th><td style={td}>{editingTable ? <input aria-label={label} style={{ width: "100%" }} value={table[key] ?? ""} onChange={(event) => setTable((current) => ({ ...current, [key]: event.target.value }))} /> : key === "website" && doc.overview[key] ? <a href={/^https?:/.test(doc.overview[key]!) ? doc.overview[key]! : `https://${doc.overview[key]}`} target="_blank" rel="noreferrer">{doc.overview[key]}</a> : doc.overview[key] ?? ""}</td></tr>)}</tbody></table>
      </div>
      {doc.sections.filter(({ key }) => ["transaction", "overview", "deal_section"].includes(key)).map((section) => <SectionEditor key={section.key} sec={section} disabled={!!busy} onSave={saveSection(section.key)} />)}
      {doc.equipment && !!doc.equipment.items.length && <div style={card} data-testid="cs2-equipment"><h3>Equipment</h3><div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr>{["Year", "Make", "Model", "Hours", "Price"].map((heading) => <th key={heading} style={th}>{heading}</th>)}</tr></thead><tbody>{doc.equipment.items.map((item: any, index: number) => <tr key={index}><td style={td}>{item.year ?? ""}</td><td style={td}>{item.make ?? ""}</td><td style={td}>{item.model ?? item.description ?? ""}</td><td style={td}>{item.hours ?? "NA"}</td><td style={td}>{money(item.price)}</td></tr>)}<tr><th style={th} colSpan={4}>Total</th><th style={th}>{money(doc.equipment.total)}</th></tr></tbody></table></div></div>}
      <div style={card} data-testid="cs2-financials"><h3>Financial Summary</h3>{!doc.financials.periods.length ? <div>No financials read yet.</div> : <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr><th style={th} />{doc.financials.periods.map((period) => <th key={period.label} style={th}>{period.label}</th>)}</tr></thead><tbody>{doc.financials.rows.map((financialRow) => <tr key={financialRow.item}><th style={th}>{ROW_LABELS[financialRow.item] ?? financialRow.item}</th>{financialRow.values.map((value, index) => <td key={index} style={td}>{cell(financialRow.item, value)}</td>)}</tr>)}</tbody></table></div>}</div>
      {doc.sections.filter(({ key }) => ["financial_commentary", "rationale", "risks"].includes(key)).map((section) => <SectionEditor key={section.key} sec={section} disabled={!!busy} onSave={saveSection(section.key)} />)}
      <div style={card} data-testid="cs2-signature"><div>If you have any questions, please give me a call.</div><div>Thanks,</div><div><strong>{submitted ? row?.submitted_by_name : "(the staff member who submits)"}</strong></div><div>Boreal Financial</div></div>
    </>}
  </div>;
}
