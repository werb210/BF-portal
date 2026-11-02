// BF_PORTAL_v872_FORECAST - the Forecast report card (Reports and the Dashboard): commission per person and team by
// month or quarter - closed, commit, best case, pipeline and weighted - next to each person's commission goal, the
// files behind it (set a close date or category right here), and Admins edit the chance each stage funds.
import { useEffect, useState, type CSSProperties } from "react";
import toast from "react-hot-toast";
import { CATEGORY_LABEL, forecastApi, money, type Bucket, type Category, type Forecast } from "@/forecast/forecastApi";
import { useReportTeam } from "@/teams/TeamFilter";
import { useIsAdmin } from "@/dealTools/ui";

const th: CSSProperties = { textAlign: "right", padding: "4px 8px", color: "var(--ui-text-muted)", fontWeight: 600, fontSize: 12, whiteSpace: "nowrap" };
const td: CSSProperties = { textAlign: "right", padding: "4px 8px", borderTop: "1px solid var(--ui-border)", color: "var(--ui-text)", fontSize: 13, whiteSpace: "nowrap" };
const tdl: CSSProperties = { ...td, textAlign: "left" };
const btn = (on: boolean): CSSProperties => ({ padding: "3px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "1px solid var(--ui-border)", background: on ? "#1e3a8a" : "var(--ui-surface-strong)", color: on ? "#ffffff" : "var(--ui-text)" });
const input: CSSProperties = { padding: "3px 6px", borderRadius: 6, border: "1px solid var(--ui-border)", background: "var(--ui-surface)", color: "var(--ui-text)", fontSize: 12 };

/** Progress against the goal: green at or over, amber from 70%, else plain; dark text on light tints in both themes. */
function Attain({ value, goal }: { value: number; goal: number | null }) {
  if (goal === null || goal <= 0) return <span style={{ color: "var(--ui-text-muted)" }}>no goal</span>;
  const pct = Math.round((value / goal) * 100);
  const look = pct >= 100 ? { bg: "#dcfce7", fg: "#14532d" } : pct >= 70 ? { bg: "#fef3c7", fg: "#78350f" } : { bg: "#f1f5f9", fg: "#1e293b" };
  return <span title={`${money(value)} of ${money(goal)}`} style={{ padding: "1px 7px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: look.bg, color: look.fg }}>{pct}%</span>;
}

function Rows({ label, periods, strong }: { label: string; periods: Array<Bucket & { label: string }>; strong?: boolean }) {
  return (
    <>
      {periods.map((b, i) => (
        <tr key={i} style={strong ? { fontWeight: 700 } : undefined}>
          {i === 0 ? <td style={{ ...tdl, fontWeight: 600 }} rowSpan={periods.length}>{label}</td> : null}
          <td style={tdl}>{b.label}</td>
          <td style={td}>{money(b.closed)}</td><td style={td}>{money(b.commit)}</td><td style={td}>{money(b.best_case)}</td><td style={td}>{money(b.pipeline)}</td>
          <td style={td}><strong>{money(b.weighted)}</strong></td><td style={td}>{b.goal_commission === null ? "-" : money(b.goal_commission)}</td>
          <td style={td}><Attain value={b.commit} goal={b.goal_commission} /></td>
        </tr>
      ))}
    </>
  );
}

function StageOdds({ onSaved }: { onSaved: () => void }) {
  const [rows, setRows] = useState<Array<{ stage: string; probability: number }> | null>(null);
  useEffect(() => { forecastApi.stages().then((r) => setRows(r.stages)).catch(() => setRows([])); }, []);
  if (!rows) return null;
  const save = async () => {
    try { await forecastApi.saveStages(Object.fromEntries(rows.map((r) => [r.stage, r.probability]))); try { toast.success("Stage chances saved."); } catch { /* */ } onSaved(); }
    catch (e) { try { toast.error(e instanceof Error ? e.message : "Could not save."); } catch { /* */ } }
  };
  return (
    <div data-testid="forecast-stage-odds" style={{ marginTop: 10, padding: 10, border: "1px dashed var(--ui-border)", borderRadius: 8 }}>
      <p style={{ margin: "0 0 6px", fontSize: 12, color: "var(--ui-text)" }}>The chance each lending stage funds (used for weighted and for the default category: 70%+ commit, 40%+ best case). These are the same probabilities as Settings &gt; Pipelines; a deal in another pipeline uses its own stage's probability.</p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {rows.map((r, i) => (
          <label key={r.stage} style={{ fontSize: 12, color: "var(--ui-text)" }}>{r.stage}{" "}
            <input aria-label={`${r.stage} chance`} style={{ ...input, width: 52 }} inputMode="numeric" value={r.probability} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, probability: Math.max(0, Math.min(100, Math.round(Number(e.target.value) || 0))) } : x)))} />%
          </label>
        ))}
      </div>
      <button type="button" style={{ ...btn(true), marginTop: 8 }} onClick={() => void save()}>Save chances</button>
    </div>
  );
}

export default function ForecastCard({ initial }: { initial?: Forecast | null }) {
  const team = useReportTeam();
  const isAdmin = useIsAdmin();
  const [g, setG] = useState<"month" | "quarter">(initial?.granularity ?? "month");
  const [d, setD] = useState<Forecast | null>(initial ?? null);
  const [showDeals, setShowDeals] = useState(false);
  const [showOdds, setShowOdds] = useState(false);
  const [err, setErr] = useState(false);
  const load = () => forecastApi.get({ granularity: g, team_id: team || undefined }).then((r) => { setD(r); setErr(false); }).catch(() => setErr(true));
  useEffect(() => { if (!initial || g !== initial.granularity || team) void load(); }, [g, team]); // eslint-disable-line react-hooks/exhaustive-deps
  if (err) return <p style={{ color: "var(--ui-text-muted)", fontSize: 13 }}>Could not load the forecast.</p>;
  if (!d) return <p style={{ color: "var(--ui-text-muted)", fontSize: 13 }}>Loading...</p>;
  const label = (bs: Bucket[]) => bs.map((b, i) => ({ ...b, label: d.periods[i]?.label ?? "" })) as Array<Bucket & { label: string }>;
  const setDeal = async (id: string, patch: { expected_close_date?: string | null; forecast_category?: Category | null }) => {
    try { await forecastApi.setFile(id, patch); await load(); } catch { try { toast.error("Could not save."); } catch { /* */ } }
  };
  return (
    <div data-testid="forecast-card">
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
        <button type="button" style={btn(g === "month")} onClick={() => setG("month")}>Monthly</button>
        <button type="button" style={btn(g === "quarter")} onClick={() => setG("quarter")}>Quarterly</button>
        {isAdmin ? <button type="button" style={btn(showOdds)} onClick={() => setShowOdds(!showOdds)}>Stage chances</button> : null}
        <span style={{ fontSize: 12, color: "var(--ui-text-muted)" }}>Commission in {d.currency}. Each column includes the ones before it. {d.own ? "Your own files." : ""}</span>
      </div>
      {showOdds ? <StageOdds onSaved={() => void load()} /> : null}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th style={{ ...th, textAlign: "left" }}>Who</th><th style={{ ...th, textAlign: "left" }}>Period</th><th style={th}>Closed</th><th style={th}>Commit</th><th style={th}>Best case</th><th style={th}>Pipeline</th><th style={th}>Weighted</th><th style={th}>Goal</th><th style={th}>Commit vs goal</th></tr></thead>
          <tbody>
            {!d.own ? <Rows label="Everyone" periods={label(d.total)} strong /> : null}
            {d.teams.map((t) => <Rows key={t.team_id} label={`Team: ${t.name}`} periods={label(t.periods)} />)}
            {d.reps.map((r) => <Rows key={r.user_id ?? "none"} label={r.name} periods={label(r.periods)} />)}
          </tbody>
        </table>
      </div>
      {d.reps.length === 0 ? <p style={{ color: "var(--ui-text-muted)", fontSize: 13 }}>No open or funded files in these periods yet.</p> : null}
      <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--ui-text)" }}>
        {d.unscheduled.files ? <><strong>{d.unscheduled.files}</strong> open file(s) have no expected close date ({money(d.unscheduled.pipeline)}, weighted {money(d.unscheduled.weighted)}). </> : null}
        {d.overdue_files ? <><strong>{d.overdue_files}</strong> file(s) are past their expected close date and counted in the first period.</> : null}
      </p>
      <button type="button" style={{ ...btn(showDeals), marginTop: 8 }} onClick={() => setShowDeals(!showDeals)}>{showDeals ? "Hide the files" : `Show the files (${d.deals.length})`}</button>
      {showDeals ? (
        <div style={{ overflowX: "auto", marginTop: 8 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={{ ...th, textAlign: "left" }}>File</th><th style={{ ...th, textAlign: "left" }}>Owner</th><th style={{ ...th, textAlign: "left" }}>Stage</th><th style={th}>Commission</th><th style={th}>Weighted</th><th style={{ ...th, textAlign: "left" }}>Expected close</th><th style={{ ...th, textAlign: "left" }}>Category</th></tr></thead>
            <tbody>
              {d.deals.map((x) => (
                <tr key={x.id} data-testid={`forecast-deal-${x.id}`}>
                  <td style={tdl}><a href={`/applications/${x.id}`} style={{ color: "var(--ui-text)" }}>{x.name}</a></td>
                  <td style={tdl}>{x.owner_name}</td>
                  <td style={tdl}>{x.stage} ({x.probability}%)</td>
                  <td style={td}>{money(x.commission)}</td><td style={td}>{money(x.weighted)}</td>
                  <td style={tdl}><input aria-label={`Expected close for ${x.name}`} type="date" style={{ ...input, borderColor: x.overdue ? "#b91c1c" : undefined }} value={x.expected_close_date ?? ""} onChange={(e) => void setDeal(x.id, { expected_close_date: e.target.value || null })} /></td>
                  <td style={tdl}>
                    <select aria-label={`Category for ${x.name}`} style={input} value={x.category} onChange={(e) => void setDeal(x.id, { forecast_category: e.target.value as Category })}>
                      {(["commit", "best_case", "pipeline", "omit"] as Category[]).map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
