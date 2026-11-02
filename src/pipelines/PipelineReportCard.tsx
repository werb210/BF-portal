// BF_PORTAL_v870_CRM_DATA_MODEL - Reports card: any pipeline's open deals by stage with amount and weighted amount, won
// and lost. Uses the Reports page team filter.
import { useEffect, useState } from "react";
import { useReportTeam } from "@/teams/TeamFilter";
import { cell, muted } from "@/settingsPack/ui";
import { LENDING_ID, money, pipelinesApi, usePipelines, type PipelineReport } from "./pipelinesApi";

export default function PipelineReportCard() {
  const list = usePipelines();
  const team = useReportTeam();
  const [pid, setPid] = useState(LENDING_ID);
  const [r, setR] = useState<PipelineReport | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { void pipelinesApi.report(pid, team).then((x) => { setR(x); setErr(null); }).catch(() => setErr("Could not load the pipeline report.")); }, [pid, team]);
  const options = (list?.pipelines ?? []).filter((p) => !p.archived_at);
  return (
    <div data-testid="pipeline-report">
      {options.length > 1 && (
        <select aria-label="Pipeline" value={pid} onChange={(e) => setPid(e.target.value)} style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid var(--ui-border)", background: "var(--ui-surface-strong)", color: "var(--ui-text)", fontSize: 13, marginBottom: 8 }}>
          {options.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      )}
      {err && <p role="alert" style={muted}>{err}</p>}
      {r && <>
        <p style={{ margin: "0 0 6px", color: "var(--ui-text)" }}><strong>{r.totals.open_deals}</strong> open deals, {money(r.totals.open_amount)}; weighted <strong>{money(r.totals.weighted_amount)}</strong>. Won {r.totals.won_deals} ({money(r.totals.won_amount)}), lost {r.totals.lost_deals}.</p>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>{r.stages.map((s) => <tr key={s.id}><td style={cell}>{s.name}</td><td style={cell}>{s.deals}</td><td style={cell}>{money(s.amount)}</td><td style={cell}>{s.outcome === "open" ? `${s.probability}%: ${money(s.weighted)}` : s.outcome}</td></tr>)}</tbody>
        </table>
      </>}
    </div>
  );
}
