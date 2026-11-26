// BF_PORTAL_TV_SCOREBOARD_v1 - Reports > Leaderboard: this month's funded volume and deals funded by broker and team,
// against the Goals funding targets. The same numbers the office TVs show.
import { useEffect, useState, type CSSProperties } from "react";
import { useReportTeam } from "@/teams/TeamFilter";
import { getErrorMessage } from "@/utils/errors";
import { getBoard, money, pct, type Board } from "./scoreboardApi";

const th: CSSProperties = { textAlign: "left", padding: "6px 8px", fontSize: 12, color: "var(--ui-text-muted)", borderBottom: "1px solid var(--ui-border)", whiteSpace: "nowrap" };
const td: CSSProperties = { padding: "7px 8px", fontSize: 13, color: "var(--ui-text)", borderBottom: "1px solid var(--ui-border)" };
const num: CSSProperties = { ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" };

export function Movement({ n }: { n: number }) {
  if (!n) return <span aria-label="No change" style={{ color: "var(--ui-text-muted)" }}>–</span>;
  return <span aria-label={n > 0 ? `Up ${n}` : `Down ${-n}`} style={{ color: n > 0 ? "#15803d" : "#b91c1c", fontWeight: 600 }}>{n > 0 ? `▲${n}` : `▼${-n}`}</span>;
}

export function GoalBar({ value, goal }: { value: number; goal: number | null }) {
  const p = pct(value, goal);
  if (p === null) return <span style={{ color: "var(--ui-text-muted)", fontSize: 12 }}>No goal</span>;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, minWidth: 120 }} title={`${money(value)} of ${money(goal ?? 0)}`}>
      <span style={{ flex: 1, height: 6, borderRadius: 3, background: "var(--ui-border)", overflow: "hidden" }}>
        <span style={{ display: "block", height: "100%", width: `${Math.min(p, 100)}%`, background: p >= 100 ? "#15803d" : "#2563eb" }} />
      </span>
      <span style={{ fontSize: 12, fontVariantNumeric: "tabular-nums" }}>{p}%</span>
    </span>
  );
}

export default function LeaderboardReport() {
  const team = useReportTeam();
  const [data, setData] = useState<Board | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let off = false;
    setError(null);
    getBoard(team).then((b) => { if (!off) setData(b); }).catch((e) => { if (!off) setError(getErrorMessage(e, "Could not load the leaderboard.")); });
    return () => { off = true; };
  }, [team]);
  if (error) return <div role="alert" style={{ color: "#b91c1c", fontSize: 13 }}>{error}</div>;
  if (!data) return <div style={{ fontSize: 13, color: "var(--ui-text-muted)" }}>Loading…</div>;
  const cur = data.currency || "CAD";
  return (
    <div data-testid="leaderboard">
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "baseline", marginBottom: 10, fontSize: 13, color: "var(--ui-text)" }}>
        <strong>{data.period.label}</strong>
        <span>{money(data.office.volume, cur)} funded · {data.office.deals} {data.office.deals === 1 ? "deal" : "deals"}</span>
        {data.office.goal ? <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>Goal {money(data.office.goal, cur)} <GoalBar value={data.office.volume} goal={data.office.goal} /></span> : null}
        <span style={{ color: "var(--ui-text-muted)" }}>{data.period.days_left} {data.period.days_left === 1 ? "day" : "days"} left</span>
      </div>
      {data.brokers.length === 0 ? <p style={{ fontSize: 13, color: "var(--ui-text-muted)" }}>No funded deals or goals yet this month.</p> : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={th}>#</th><th style={th} /><th style={th}>Broker</th><th style={th}>Team</th><th style={{ ...th, textAlign: "right" }}>Deals funded</th><th style={{ ...th, textAlign: "right" }}>Funded volume</th><th style={th}>Goal</th></tr></thead>
            <tbody>
              {data.brokers.map((b) => (
                <tr key={b.user_id} data-testid="leaderboard-row">
                  <td style={{ ...td, fontWeight: 700 }}>{b.rank}</td>
                  <td style={td}><Movement n={b.movement} /></td>
                  <td style={td}>{b.name}</td>
                  <td style={{ ...td, color: "var(--ui-text-muted)" }}>{b.team ?? "—"}</td>
                  <td style={num}>{b.deals}</td>
                  <td style={num}>{money(b.volume, cur)}</td>
                  <td style={td}><GoalBar value={b.volume} goal={b.goal} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data.teams.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--ui-text)" }}>Teams</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={th}>#</th><th style={th}>Team</th><th style={{ ...th, textAlign: "right" }}>Brokers</th><th style={{ ...th, textAlign: "right" }}>Deals funded</th><th style={{ ...th, textAlign: "right" }}>Funded volume</th><th style={th}>Goal</th></tr></thead>
            <tbody>
              {data.teams.map((t) => (
                <tr key={t.id} data-testid="leaderboard-team">
                  <td style={{ ...td, fontWeight: 700 }}>{t.rank}</td><td style={td}>{t.name}</td><td style={num}>{t.brokers}</td>
                  <td style={num}>{t.deals}</td><td style={num}>{money(t.volume, cur)}</td><td style={td}><GoalBar value={t.volume} goal={t.goal} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p style={{ fontSize: 12, color: "var(--ui-text-muted)", margin: "10px 0 0" }}>Funding goals are set in the Goals report. Amounts in CAD; US-dollar deals are converted.</p>
    </div>
  );
}
