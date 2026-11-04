// BF_PORTAL_v867_BROKER_TOOLS_SCORECARDS - Deal desk > Credit scorecard: score, grade, pre-decision rule hits and the lender
// ranking for this deal. Signals only - staff decide.
import { useCallback, useEffect, useState } from "react";
import { api } from "@/api";
import { Chip, ErrorLine, card, h3, muted, primaryButton, row, table, td, th } from "./ui";
import { useRun } from "./useRun";
import { OUTCOME_LABEL, OUTCOME_TONE } from "./scorecardView";
import { productNameWords } from "@/utils/labels"; // BF_PORTAL_v887_PRODUCT_LABELS

type Result = {
  score: number | null; grade: string | null; outcome: string; coverage: number; computed_at: string;
  factors: { key: string; label: string; value: number | null; weight: number; points: number | null }[];
  hits: { id: string; outcome: string; message: string }[]; missing: string[];
  lenders: { lender_product_id: string; lender_name: string | null; product_name: string; fit: number; reasons: string[]; concerns: string[] }[];
};

export default function ScorecardPanel({ applicationId }: { applicationId: string }) {
  const base = `/api/deal-desk/applications/${encodeURIComponent(applicationId)}/scorecard`;
  const [result, setResult] = useState<Result | null | undefined>(undefined);
  const load = useCallback(async () => { const r = await api.get<{ result: Result | null }>(base).catch(() => null); setResult(r?.result ?? null); }, [base]);
  const { busy, err, run } = useRun();
  useEffect(() => { void load(); }, [load]);
  const score = () => run(async () => { const r = await api.post<{ result: Result }>(base); setResult(r?.result ?? null); });

  return (
    <section style={card} data-testid="scorecard-panel">
      <h3 style={h3}>Credit scorecard</h3>
      <p style={muted}>A grade and the pre-decision rules this deal hits, from the application, the banking analysis and any credit bureau report. Signals only - you decide.</p>
      <div style={{ ...row, marginTop: 8 }}>
        <button type="button" style={primaryButton} disabled={busy} onClick={() => void score()}>{result ? "Score again" : "Score this deal"}</button>
        {result && <span style={{ fontSize: 13, color: "var(--ui-text-muted)" }}>Scored {new Date(result.computed_at).toLocaleString("en-CA")}</span>}
      </div>
      <ErrorLine text={err} />
      {result === undefined ? <p style={muted}>Loading...</p> : result === null ? null : (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }} data-testid="scorecard-summary">
            <strong style={{ fontSize: 22 }}>{result.grade ?? "-"}</strong>
            <span style={{ fontSize: 14 }}>Score {result.score ?? "-"} / 100</span>
            <Chip tone={OUTCOME_TONE[result.outcome] ?? "grey"}>{OUTCOME_LABEL[result.outcome] ?? result.outcome}</Chip>
            <span style={{ fontSize: 13, color: "var(--ui-text-muted)" }}>Based on {result.coverage}% of the weighted factors</span>
          </div>
          {result.hits.length > 0 && (
            <ul style={{ margin: "8px 0", paddingLeft: 18, fontSize: 13 }}>
              {result.hits.map((h) => <li key={h.id}><Chip tone={OUTCOME_TONE[h.outcome] ?? "grey"}>{OUTCOME_LABEL[h.outcome] ?? h.outcome}</Chip> {h.message}</li>)}
            </ul>
          )}
          {result.missing.length > 0 && <p style={muted}>Not scored (no data yet): {result.missing.join(", ")}.</p>}
          <div style={{ overflowX: "auto", marginTop: 8 }}>
            <table style={table}>
              <thead><tr>{["Factor", "Value", "Points", "Weight"].map((x) => <th key={x} style={th}>{x}</th>)}</tr></thead>
              <tbody>{result.factors.map((f) => <tr key={f.key}><td style={td}>{f.label}</td><td style={td}>{f.value ?? "-"}</td><td style={td}>{f.points ?? "-"}</td><td style={td}>{f.weight}</td></tr>)}</tbody>
            </table>
          </div>
          {result.lenders.length > 0 && (
            <>
              <h3 style={{ ...h3, marginTop: 12 }}>Lender fit</h3>
              <div style={{ overflowX: "auto" }}>
                <table style={table} data-testid="lender-fit">
                  <thead><tr>{["Lender", "Product", "Fit", "Why"].map((x) => <th key={x} style={th}>{x}</th>)}</tr></thead>
                  <tbody>{result.lenders.map((l) => (
                    <tr key={l.lender_product_id}>
                      <td style={td}>{l.lender_name ?? "-"}</td><td style={td}>{productNameWords(l.product_name)}</td>
                      <td style={td}><Chip tone={l.concerns.length ? "amber" : "green"}>{l.fit}</Chip></td>
                      <td style={td}>{[...l.reasons, ...l.concerns].join(" ")}</td>
                    </tr>))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
