// BF_PORTAL_AD_NEGATIVES_v1
// Weekly candidate list for negative keywords. Every row spent money and converted nothing.
import { Fragment, useCallback, useEffect, useState, type CSSProperties } from "react";
import { chooseMatch, batchByMatch } from "./autoMatch";
import { apiClient } from "@/api/client";
import Skeleton from "@/components/Skeleton";
// BF_PORTAL_NEGATIVES_CAMPAIGN_PICKER_v177 - the campaign ID was a free-text
// box and the Add button stayed disabled until someone pasted a numeric ID
// out of the Google Ads URL. BF-Server v176 lists the real campaigns.
import { unwrapCampaigns, campaignLabel, type AdCampaign, type CampaignsResponse } from "./negativesCampaigns";

type Candidate = { searchTerm: string; cost: number; clicks: number; impressions: number; conversions: number };
// BF_PORTAL_NEGATIVES_UNDO_v435 - ads_negatives_log keeps Google's resourceName,
// which is the only handle that can remove a criterion again.
type AppliedNegative = { id: string; campaign_id: string; term: string; match_type: string; resource_name: string | null; added_at: string };
type RecentResponse = { negatives?: AppliedNegative[] } | { data?: { negatives?: AppliedNegative[] } } | AppliedNegative[];

function unwrapNegatives(response: RecentResponse | null | undefined): AppliedNegative[] {
  if (Array.isArray(response)) return response;
  const envelope = (response as { data?: { negatives?: AppliedNegative[] } } | null)?.data;
  if (envelope && Array.isArray(envelope.negatives)) return envelope.negatives;
  const direct = (response as { negatives?: AppliedNegative[] } | null)?.negatives;
  return Array.isArray(direct) ? direct : [];
}

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

// BF_PORTAL_NEGATIVES_GUARD_v625 - BF-Server v623 adds the protected searches, the
// account's conversion count and whether the keyword check could run.
type CandidateMeta = { protectedTerms: string[]; accountConversions: number | null; keywordCheck: string };
function candidateMeta(response: unknown): CandidateMeta {
  const r = (response ?? {}) as Record<string, unknown>;
  const body = (r.data && typeof r.data === "object" ? r.data : r) as Record<string, unknown>;
  return {
    protectedTerms: Array.isArray(body.protectedTerms) ? (body.protectedTerms as unknown[]).map(String) : [],
    accountConversions: typeof body.accountConversions === "number" ? body.accountConversions : null,
    keywordCheck: typeof body.keywordCheck === "string" ? body.keywordCheck : "ok",
  };
}
type Conflict = { kind: string; source: string; negative: string; matchType: string; resourceName: string; blocks: string[] };
const money = (value: unknown) => `$${Number(value ?? 0).toFixed(2)}`;
const card: CSSProperties = { background: "var(--ui-surface-strong)", borderRadius: 8, padding: 16, marginBottom: 16 };
const th: CSSProperties = { textAlign: "left", padding: "8px 12px", fontSize: 12, textTransform: "uppercase", color: "var(--ui-text-muted)", borderBottom: "1px solid var(--ui-border)" };
const td: CSSProperties = { padding: "8px 12px", borderBottom: "1px solid var(--ui-border)", fontSize: 13 };

export default function NegativesPanel() {
  const [days, setDays] = useState(7);
  const [minCost, setMinCost] = useState(10);
  // BF_PORTAL_NEGATIVES_GUARD_v625 - one $3 click is not evidence; default to 2 clicks and $10.
  const [minClicks, setMinClicks] = useState(2);
  const [widen, setWiden] = useState<Set<string>>(new Set());
  const [meta, setMeta] = useState<CandidateMeta>({ protectedTerms: [], accountConversions: null, keywordCheck: "ok" });
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [conflictsErr, setConflictsErr] = useState<string | null>(null);
  const [removingConflict, setRemovingConflict] = useState<string | null>(null);
  const [campaignId, setCampaignId] = useState("");
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [campaignsErr, setCampaignsErr] = useState<string | null>(null);
  const [rows, setRows] = useState<Candidate[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [applied, setApplied] = useState<AppliedNegative[]>([]);
  const [removing, setRemoving] = useState<string | null>(null);
  const [undoErr, setUndoErr] = useState<string | null>(null);

  const loadApplied = useCallback(() => {
    apiClient.get<RecentResponse>("/api/marketing/negative-keywords/recent")
      .then((response) => setApplied(unwrapNegatives(response)))
      .catch(() => setApplied([]));
  }, []);

  useEffect(() => { loadApplied(); }, [loadApplied]);

  const undo = async (row: AppliedNegative) => {
    setRemoving(row.id); setUndoErr(null);
    try {
      await apiClient.post(`/api/marketing/negative-keywords/${encodeURIComponent(row.id)}/remove`, {});
      setApplied((previous) => previous.filter((item) => item.id !== row.id));
      // The term is blocking nothing again, so it can reappear as a candidate.
      load();
    } catch (error) {
      setUndoErr(error instanceof Error ? error.message : "Google Ads would not remove it.");
    } finally { setRemoving(null); }
  };

  // BF_PORTAL_NEGATIVES_PLAIN_LANGUAGE_v420 - "Phrase" and "Exact" are Google's
  // words for a mechanism. Staff need the consequence instead, per term, with the
  // damage shown before they commit.
  const [mode, setMode] = useState<Record<string, "only" | "containing">>({});
  const [impact, setImpact] = useState<Record<string, { alsoBlocks: Array<{ searchTerm: string; cost: number; conversions: number }>; totalCost: number; convertingCount: number }>>({});
  const modeFor = (term: string): "only" | "containing" =>
    mode[term] ?? (term.includes(" ") ? "containing" : "only");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<AddResult | null>(null);
  const [busy, setBusy] = useState(false);

  // BF_PORTAL_NEGATIVES_CAMPAIGN_PICKER_v177
  useEffect(() => {
    apiClient.get<CampaignsResponse>("/api/marketing/campaigns?pageSize=200")
      .then((response) => {
        const list = unwrapCampaigns(response);
        setCampaigns(list);
        setCampaignsErr(list.length === 0 ? "No campaigns returned - check the Google Ads credentials." : null);
      })
      .catch((error: Error) => setCampaignsErr(error?.message ?? "Could not load campaigns."));
  }, []);

  const load = useCallback(() => {
    setLoading(true); setErr(null); setResult(null);
    // BF_PORTAL_NEGATIVES_CAMPAIGN_SCOPE_v415 - the campaign now scopes the list,
    // not just the apply target. Before this, every campaign showed the same rows.
    apiClient.get<CandidatesResponse>(`/api/marketing/negative-candidates?days=${days}&minCost=${minCost}&minClicks=${minClicks}` + (campaignId.trim() ? `&campaignId=${encodeURIComponent(campaignId.trim())}` : ""))
      .then((response) => { setRows(unwrapCandidates(response)); setMeta(candidateMeta(response)); setPicked(new Set()); setWiden(new Set()); })
      .catch((error: Error) => setErr(error?.message ?? "Could not load candidates."))
      .finally(() => setLoading(false));
  }, [days, minCost, minClicks, campaignId]);

  useEffect(() => { load(); }, [load]);
  // BF_PORTAL_NEGATIVES_CONFLICTS_v625 - negatives already in Google Ads that block our own keywords.
  const loadConflicts = useCallback(() => {
    setConflictsErr(null);
    apiClient.get<{ conflicts?: Conflict[]; data?: { conflicts?: Conflict[] } }>(`/api/marketing/negative-conflicts` + (campaignId.trim() ? `?campaignId=${encodeURIComponent(campaignId.trim())}` : ""))
      .then((response) => {
        const direct = response?.conflicts;
        const wrapped = response?.data?.conflicts;
        setConflicts(Array.isArray(direct) ? direct : Array.isArray(wrapped) ? wrapped : []);
      })
      .catch((error: Error) => { setConflicts([]); setConflictsErr(error?.message ?? "Could not check for conflicts."); });
  }, [campaignId]);
  useEffect(() => { loadConflicts(); }, [loadConflicts]);
  const removeConflict = async (row: Conflict) => {
    setRemovingConflict(row.resourceName); setConflictsErr(null);
    try {
      await apiClient.post("/api/marketing/negative-conflicts/remove", { resourceName: row.resourceName });
      setConflicts((previous) => previous.filter((item) => item.resourceName !== row.resourceName));
      loadApplied();
    } catch (error) {
      setConflictsErr(error instanceof Error ? error.message : "Google Ads would not remove it.");
    } finally { setRemovingConflict(null); }
  };
  const toggleWiden = (term: string) => setWiden((previous) => {
    const next = new Set(previous);
    if (next.has(term)) next.delete(term); else next.add(term);
    return next;
  });

  useEffect(() => {
    const containing = Array.from(picked).filter((t) => modeFor(t) === "containing");
    if (containing.length === 0) { setImpact({}); return; }
    apiClient
      .get<{ impact: Array<{ term: string; alsoBlocks: Array<{ searchTerm: string; cost: number; conversions: number }>; totalCost: number; convertingCount: number }> }>(
        `/api/marketing/negative-impact?matchType=PHRASE&terms=${encodeURIComponent(containing.join("\n"))}` +
        (campaignId.trim() ? `&campaignId=${encodeURIComponent(campaignId.trim())}` : ""))
      .then((r) => {
        const next: typeof impact = {};
        for (const row of r?.impact ?? []) next[row.term] = row;
        setImpact(next);
      })
      .catch(() => setImpact({}));
  }, [picked, mode, campaignId]);

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
      // v433 - the match type is derived per term, not chosen by the operator.
      const allTerms = rows.map((row) => row.searchTerm);
      const converting = [...meta.protectedTerms, ...rows.filter((row) => Number(row.conversions ?? 0) > 0).map((row) => row.searchTerm)];
      const batches = batchByMatch(Array.from(picked), allTerms, converting, widen);
      for (const batch of batches) {
        const response = await apiClient.post<{ data?: AddResult } & AddResult>("/api/marketing/negative-keywords", {
          // BF_PORTAL_NEGATIVES_PER_TERM_MATCH_v418 - a single-word term is only valid
          // as EXACT, so it goes in its own request instead of being rejected.
          campaignId: campaignId.trim(),
          terms: batch.terms,
          matchType: batch.matchType,
        });
        const output = (response?.data ?? response) as AddResult;
        setResult(output);
        if (output?.added?.length) {
          setRows((previous) => previous.filter((row) => !output.added.includes(row.searchTerm)));
          setPicked((previous) => { const next = new Set(previous); output.added.forEach((term) => next.delete(term)); return next; });
        }
      }
      loadApplied();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Google Ads rejected the request.");
    } finally { setBusy(false); }
  };

  const disabled = busy || picked.size === 0 || !campaignId.trim() || meta.keywordCheck !== "ok";
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
            {[0, 1, 5, 10, 25].map((value) => <option key={value} value={value}>${value}</option>)}
          </select>
        </label>
        <label style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>Min clicks<br />
          <select value={minClicks} onChange={(event) => setMinClicks(Number(event.target.value))} data-testid="negatives-min-clicks" style={{ padding: "6px 10px", marginTop: 4 }}>
            {[1, 2, 3, 5].map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <label style={{ fontSize: 12, color: "var(--ui-text-muted)", flex: 1, minWidth: 200 }}>Campaign (filters the list and receives the negatives)<br />
          {campaigns.length > 0 ? (
            <select value={campaignId} onChange={(event) => setCampaignId(event.target.value)} data-testid="negatives-campaign-id" style={{ padding: "6px 10px", marginTop: 4, width: "100%", boxSizing: "border-box" }}>
              <option value="">All campaigns — pick one to apply</option>
              {campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaignLabel(campaign)}</option>)}
            </select>
          ) : (
            <input value={campaignId} onChange={(event) => setCampaignId(event.target.value)} placeholder="e.g. 21234567890" data-testid="negatives-campaign-id" style={{ padding: "6px 10px", marginTop: 4, width: "100%", boxSizing: "border-box" }} />
          )}
          {campaignsErr && <span style={{ display: "block", marginTop: 4, color: "var(--ui-text-muted)" }}>{campaignsErr}</span>}
        </label>
        {/* BF_PORTAL_NEGATIVES_AUTO_MATCH_v433 - the panel picks the match type
            per term now; the global dropdown made staff guess at blast radius. */}
      </div>
            <div style={{ ...card, borderLeft: "3px solid #b8860b" }}>Tick the searches that wasted money. Each one blocks only that exact search unless you tick "also block similar searches". Searches that match one of your keywords, brought in a lead, or converted are never listed and can never be blocked.</div>
      {meta.accountConversions === 0 && <div style={{ ...card, borderLeft: "3px solid #b00020" }} data-testid="negatives-no-conversions">Google Ads has recorded no conversions in the last 30 days, so "converted nothing" says nothing about these searches. Block only searches that are clearly off-topic.</div>}
      {meta.keywordCheck !== "ok" && <div style={{ ...card, borderLeft: "3px solid #b00020" }} data-testid="negatives-keyword-check">Could not read your keywords from Google Ads. Adding negatives is paused until it can.</div>}
      {(conflicts.length > 0 || conflictsErr) && <div style={{ ...card, borderLeft: "3px solid #b00020" }} data-testid="negatives-conflicts">
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>These negatives are blocking your own keywords</h3>
        {conflictsErr && <div style={{ color: "#b00020", fontSize: 13, marginBottom: 8 }}>{conflictsErr}</div>}
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th style={th}>Negative</th><th style={th}>Where</th><th style={th}>Blocks your keywords</th><th style={{ ...th, width: 90 }} /></tr></thead>
          <tbody>{conflicts.map((row) => <tr key={row.resourceName}>
            <td style={td}>{row.negative}</td>
            <td style={td}>{row.source}</td>
            <td style={td}>{row.blocks.join(", ")}</td>
            <td style={td}><button type="button" onClick={() => void removeConflict(row)} disabled={removingConflict === row.resourceName} data-testid={`negatives-conflict-remove-${row.negative}`} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid var(--ui-border)", background: "var(--ui-surface-strong)", color: "var(--ui-text)" }}>{removingConflict === row.resourceName ? "Removing…" : "Remove"}</button></td>
          </tr>)}</tbody>
        </table>
      </div>}
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
          {/* BF_PORTAL_NEGATIVES_REASON_LINE_v434 - a ticked row explains what it
              is about to block, before the operator commits to it. */}
          <tbody>{rows.map((row) => {
            const decision = picked.has(row.searchTerm)
              ? chooseMatch(
                  row.searchTerm,
                  rows.map((candidate) => candidate.searchTerm),
                  [...meta.protectedTerms, ...rows.filter((candidate) => Number(candidate.conversions ?? 0) > 0).map((candidate) => candidate.searchTerm)],
                  widen.has(row.searchTerm),
                )
              : null;
            const touchesAConverter = decision?.reason.includes("converted") ?? false;
            return (
              <Fragment key={row.searchTerm}>
                <tr>
                  <td style={td}><input type="checkbox" checked={picked.has(row.searchTerm)} onChange={() => toggle(row.searchTerm)} aria-label={`Select ${row.searchTerm}`} /></td>
                  <td style={td}>{row.searchTerm}</td>
                  <td style={td}>{money(row.cost)}</td>
                  <td style={td}>{row.clicks}</td>
                  <td style={td}>{row.impressions}</td>
                </tr>
                {decision && (
                  <tr data-testid={`negatives-reason-${row.searchTerm}`}>
                    <td />
                    <td colSpan={4} style={{ ...td, borderTop: "none", paddingTop: 0, fontSize: 12, color: touchesAConverter ? "#b00020" : "var(--ui-text-muted)" }}>
                      {decision.reason}
                      <label style={{ display: "block", marginTop: 2 }}><input type="checkbox" checked={widen.has(row.searchTerm)} onChange={() => toggleWiden(row.searchTerm)} data-testid={`negatives-widen-${row.searchTerm}`} /> also block similar searches</label>
                      {decision.alsoBlocks.length > 0 && (
                        <span style={{ display: "block", marginTop: 2 }}>{decision.alsoBlocks.join(", ")}</span>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
            {rows.length === 0 && <tr><td style={td} colSpan={5}>Nothing wasted in this window.</td></tr>}
          </tbody></table>
      </div>}
      {applied.length > 0 && <div style={card} data-testid="negatives-applied">
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Blocked searches — you can undo any of these</h3>
        {undoErr && <div style={{ color: "#b00020", fontSize: 13, marginBottom: 8 }}>{undoErr}</div>}
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th style={th}>Search term</th><th style={th}>Blocks</th><th style={th}>Added</th><th style={{ ...th, width: 90 }} /></tr></thead>
          <tbody>{applied.map((row) => <tr key={row.id}>
            <td style={td}>{row.term}</td>
            <td style={td}>{row.match_type === "PHRASE" ? "anything containing it" : row.match_type === "BROAD" ? "anything with all these words" : "only this exact search"}</td>{/* BF_PORTAL_BLOCK_v528 */}
            <td style={td}>{row.added_at ? new Date(row.added_at).toLocaleString() : "—"}</td>
            <td style={td}>
              <button
                onClick={() => void undo(row)}
                disabled={removing === row.id || !row.resource_name}
                title={row.resource_name ? "Stop blocking this search" : "Added before undo was recorded — remove it in Google Ads"}
                data-testid={`negatives-undo-${row.id}`}
                style={{ padding: "4px 10px", borderRadius: 6, cursor: row.resource_name ? "pointer" : "not-allowed", border: "1px solid var(--ui-border)", background: "var(--ui-surface-strong)", color: "var(--ui-text)" }}
              >{removing === row.id ? "Removing…" : "Undo"}</button>
            </td>
          </tr>)}</tbody>
        </table>
      </div>}
    </div>
  );
}
