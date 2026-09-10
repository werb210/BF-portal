// BF_PORTAL_AD_NEGATIVES_v1
// Weekly candidate list for negative keywords. Every row spent money and converted nothing.
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { apiClient } from "@/api/client";
import Skeleton from "@/components/Skeleton";

type Candidate = { searchTerm: string; cost: number; clicks: number; impressions: number; conversions: number };
type AddResult = { added: string[]; failed: Array<{ term: string; error: string }> };

// BF_PORTAL_NEGATIVES_TYPECHECK_v1
// apiClient.get<T> resolves to T already - it does NOT wrap in { data }. The
// generic was typed as the narrow shape and then `.data` was read off it, which
// fails tsc with TS2339 and reddened main. Some BF-Server routes still answer
// with an envelope, so accept either shape the way src/api/crm.ts does and
// narrow with a helper.
type CandidatesResponse = { candidates?: Candidate[] } | { data?: { candidates?: Candidate[] } } | Candidate[];

function unwrapCandidates(response: CandidatesResponse | null | undefined): Candidate[] {
  if (Array.isArray(response)) return response;
  const envelope = (response as { data?: { candidates?: Candidate[] } } | null)?.data;
  if (envelope && Array.isArray(envelope.candidates)) return envelope.candidates;
  const direct = (response as { candidates?: Candidate[] } | null)?.candidates;
  return Array.isArray(direct) ? direct : [];
}

const money = (value: unknown) => `$${Number(value ?? 0).toFixed(2)}`;
const card: CSSProperties = { background: "var(--ui-surface-strong)", borderRadius: 8, padding: 16, marginBottom: 16 };
const th: CSSProperties = { textAlign: "left", padding: "8px 12px", fontSize: 12, textTransform: "uppercase", color: "var(--ui-text-muted)", borderBottom: "1px solid var(--ui-border)" };
const td: CSSProperties = { padding: "8px 12px", borderBottom: "1px solid var(--ui-border)", fontSize: 13 };

export default function NegativesPanel() {
  const [days, setDays] = useState(7);
  const [minCost, setMinCost] = useState(1);
  const [campaignId, setCampaignId] = useState("");
  const [matchType, setMatchType] = useState<"PHRASE" | "EXACT">("PHRASE");
  const [rows, setRows] = useState<Candidate[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<AddResult | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true); setErr(null); setResult(null);
    apiClient.get<CandidatesResponse>(`/api/marketing/negative-candidates?days=${days}&minCost=${minCost}`)
      .then((response) => { setRows(unwrapCandidates(response)); setPicked(new Set()); })
      .catch((error: Error) => setErr(error?.message ?? "Could not load candidates."))
      .finally(() => setLoading(false));
  }, [days, minCost]);

  useEffect(() => { load(); }, [load]);

  const toggle = (term: string) => setPicked((previous) => {
    const next = new Set(previous);
    if (next.has(term)) next.delete(term); else next.add(term);
    return next;
  });
  const wasted = rows.filter((row) => picked.has(row.searchTerm)).reduce((sum, row) => sum + Number(row.cost ?? 0), 0);

  const submit = async () => {
    if (picked.size === 0 || !campaignId.trim()) return;
    setBusy(true); setErr(null); setResult(null);
    try {
      const response = await apiClient.post<{ data?: AddResult } & AddResult>("/api/marketing/negative-keywords", {
        campaignId: campaignId.trim(), terms: Array.from(picked), matchType,
      });
      const output = (response?.data ?? response) as AddResult;
      setResult(output);
      if (output?.added?.length) {
        setRows((previous) => previous.filter((row) => !output.added.includes(row.searchTerm)));
        setPicked((previous) => { const next = new Set(previous); output.added.forEach((term) => next.delete(term)); return next; });
      }
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Google Ads rejected the request.");
    } finally { setBusy(false); }
  };

  const disabled = busy || picked.size === 0 || !campaignId.trim();
  return (
    <div data-testid="negatives-panel">
      <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 16 }}>
        <label style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>Window<br />
          <select value={days} onChange={(event) => setDays(Number(event.target.value))} style={{ padding: "6px 10px", marginTop: 4 }}>
            {[7, 14, 30, 90].map((value) => <option key={value} value={value}>{value} days</option>)}
          </select>
        </label>
        <label style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>Min spend<br />
          <select value={minCost} onChange={(event) => setMinCost(Number(event.target.value))} style={{ padding: "6px 10px", marginTop: 4 }}>
            {[0, 1, 5, 10].map((value) => <option key={value} value={value}>${value}</option>)}
          </select>
        </label>
        <label style={{ fontSize: 12, color: "var(--ui-text-muted)", flex: 1, minWidth: 200 }}>Campaign ID (numeric, from the Google Ads URL)<br />
          <input value={campaignId} onChange={(event) => setCampaignId(event.target.value)} placeholder="e.g. 21234567890" data-testid="negatives-campaign-id" style={{ padding: "6px 10px", marginTop: 4, width: "100%", boxSizing: "border-box" }} />
        </label>
        <label style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>Match<br />
          <select value={matchType} onChange={(event) => setMatchType(event.target.value as "PHRASE" | "EXACT")} style={{ padding: "6px 10px", marginTop: 4 }}><option value="PHRASE">Phrase</option><option value="EXACT">Exact</option></select>
        </label>
      </div>
      {matchType === "PHRASE" && Array.from(picked).some((term) => !term.includes(" ")) && <div style={{ ...card, borderLeft: "3px solid #b8860b" }}>A single-word term as Phrase blocks every query containing it — “loans” would block “business loans”. Those will be rejected; switch to Exact for them.</div>}
      {loading && <Skeleton />}
      {err && <div style={{ ...card, color: "#b00020" }} data-testid="negatives-error">{err}</div>}
      {result && <div style={card} data-testid="negatives-result"><strong>{result.added.length} added.</strong>{result.failed.length > 0 && <ul style={{ marginTop: 8 }}>{result.failed.map((failure) => <li key={failure.term} style={{ color: "#b00020", fontSize: 13 }}>{failure.term} — {failure.error}</li>)}</ul>}</div>}
      {!loading && !err && <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600 }}>Spent money, converted nothing — last {days} days</h2>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}><span style={{ fontSize: 13, color: "var(--ui-text-muted)" }}>{picked.size} selected · {money(wasted)}</span>
            <button type="button" onClick={() => void submit()} disabled={disabled} data-testid="negatives-submit" style={{ padding: "6px 14px", borderRadius: 6, fontSize: 13, cursor: disabled ? "not-allowed" : "pointer", border: "1px solid var(--ui-border)", background: !disabled ? "#0B1F3A" : "var(--ui-surface-strong)", color: !disabled ? "#fff" : "var(--ui-text-muted)" }}>{busy ? "Adding…" : "Add as negatives"}</button>
          </div>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr><th style={{ ...th, width: 36 }} /><th style={th}>Search term</th><th style={th}>Cost</th><th style={th}>Clicks</th><th style={th}>Impressions</th></tr></thead>
          <tbody>{rows.map((row) => <tr key={row.searchTerm}><td style={td}><input type="checkbox" checked={picked.has(row.searchTerm)} onChange={() => toggle(row.searchTerm)} aria-label={`Select ${row.searchTerm}`} /></td><td style={td}>{row.searchTerm}</td><td style={td}>{money(row.cost)}</td><td style={td}>{row.clicks}</td><td style={td}>{row.impressions}</td></tr>)}
            {rows.length === 0 && <tr><td style={td} colSpan={5}>Nothing wasted in this window.</td></tr>}
          </tbody></table>
      </div>}
    </div>
  );
}
