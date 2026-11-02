// BF_PORTAL_v867_BROKER_TOOLS_SCORECARDS - Settings > Deal tools > Credit scorecard: factor weights and bands, grade thresholds and
// the pre-decision rules. Admins edit; staff can look.
import { useEffect, useState } from "react";
import { api } from "@/api";
import { ErrorLine, card, dangerButton, h3, input, label, muted, primaryButton, row, secondaryButton, table, td, th } from "./ui";
import { useRun } from "./useRun";
import { bandsText, parseBands, type Band } from "./scorecardView";

type Rule = { id: string; factor: string; op: string; value: number | null; outcome: string; message: string };
type Config = { factors: { key: string; weight: number; bands: Band[] }[]; grades: { grade: string; min_score: number }[]; rules: Rule[]; lender_min_grade: Record<string, string> };

export default function ScorecardSettings({ isAdmin }: { isAdmin: boolean }) {
  const [config, setConfig] = useState<Config | null>(null);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [bandText, setBandText] = useState<Record<string, string>>({});
  const [rule, setRule] = useState({ factor: "nsf_per_month", op: ">", value: "", outcome: "refer", message: "" });
  const apply = (c: Config) => { setConfig(c); setBandText(Object.fromEntries(c.factors.map((f) => [f.key, bandsText(f.bands)]))); };
  const { busy, err, msg, setErr, run } = useRun();
  useEffect(() => { void api.get<any>("/api/deal-desk/scorecard").then((r) => { if (r?.config) apply(r.config); setLabels(r?.factors ?? {}); }).catch(() => setConfig(null)); }, []);
  if (!config) return <section style={card}><h3 style={h3}>Credit scorecard</h3><p style={muted}>Loading...</p></section>;

  const save = () => {
    const factors: Config["factors"] = [];
    for (const f of config.factors) {
      const bands = parseBands(bandText[f.key] ?? "");
      if (!bands) { setErr(`${labels[f.key] ?? f.key}: write bands like "0-1:10, 1-2:40, 2-:100".`); return; }
      factors.push({ ...f, bands });
    }
    void run(async () => { const r = await api.put<any>("/api/deal-desk/scorecard", { ...config, factors }); if (r?.config) apply(r.config); }, "Scorecard saved.");
  };
  const setWeight = (key: string, w: string) => setConfig({ ...config, factors: config.factors.map((f) => (f.key === key ? { ...f, weight: Number(w) || 0 } : f)) });

  return (
    <section style={card} data-testid="scorecard-settings">
      <h3 style={h3}>Credit scorecard</h3>
      <p style={muted}>Each factor scores 0 to 100 points by band (from - to : points; leave an end blank for open). The score is the weighted average; the grade comes from the thresholds. Rules flag a deal to refer or decline - signals only.</p>
      <div style={{ overflowX: "auto" }}>
        <table style={table}>
          <thead><tr>{["Factor", "Weight", "Bands"].map((x) => <th key={x} style={th}>{x}</th>)}</tr></thead>
          <tbody>{config.factors.map((f) => (
            <tr key={f.key}>
              <td style={td}>{labels[f.key] ?? f.key}</td>
              <td style={td}><input aria-label={`Weight for ${labels[f.key] ?? f.key}`} style={{ ...input, width: 70 }} disabled={!isAdmin} value={String(f.weight)} onChange={(e) => setWeight(f.key, e.target.value)} /></td>
              <td style={td}><input aria-label={`Bands for ${labels[f.key] ?? f.key}`} style={{ ...input, minWidth: 260, width: "100%" }} disabled={!isAdmin} value={bandText[f.key] ?? ""} onChange={(e) => setBandText((x) => ({ ...x, [f.key]: e.target.value }))} /></td>
            </tr>))}
          </tbody>
        </table>
      </div>
      <div style={{ ...row, marginTop: 8 }}>
        {config.grades.map((g, i) => (
          <label key={g.grade} style={label}>Grade {g.grade} from
            <input style={{ ...input, width: 70 }} disabled={!isAdmin} value={String(g.min_score)} onChange={(e) => setConfig({ ...config, grades: config.grades.map((x, j) => (j === i ? { ...x, min_score: Number(e.target.value) || 0 } : x)) })} />
          </label>
        ))}
      </div>
      <h3 style={{ ...h3, marginTop: 12 }}>Pre-decision rules</h3>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
        {config.rules.map((r) => (
          <li key={r.id} style={{ marginBottom: 4 }}>
            {r.outcome}: {labels[r.factor] ?? r.factor} {r.op === "missing" ? "is missing" : `${r.op} ${r.value}`} - {r.message}{" "}
            {isAdmin && <button type="button" style={{ ...dangerButton, padding: "2px 8px" }} onClick={() => setConfig({ ...config, rules: config.rules.filter((x) => x.id !== r.id) })}>Remove</button>}
          </li>
        ))}
      </ul>
      {isAdmin && (
        <>
          <div style={{ ...row, marginTop: 8 }}>
            <label style={label}>Factor<select style={input} value={rule.factor} onChange={(e) => setRule({ ...rule, factor: e.target.value })}>{Object.entries(labels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
            <label style={label}>Test<select style={input} value={rule.op} onChange={(e) => setRule({ ...rule, op: e.target.value })}>{["<", "<=", ">", ">=", "missing"].map((o) => <option key={o} value={o}>{o}</option>)}</select></label>
            <label style={label}>Value<input style={{ ...input, width: 90 }} value={rule.value} onChange={(e) => setRule({ ...rule, value: e.target.value })} /></label>
            <label style={label}>Outcome<select style={input} value={rule.outcome} onChange={(e) => setRule({ ...rule, outcome: e.target.value })}><option value="refer">Refer</option><option value="decline">Decline</option><option value="note">Note</option></select></label>
            <label style={label}>Message<input style={input} value={rule.message} onChange={(e) => setRule({ ...rule, message: e.target.value })} /></label>
            <button type="button" style={secondaryButton} onClick={() => { setConfig({ ...config, rules: [...config.rules, { ...rule, id: `r${Date.now()}`, value: rule.op === "missing" ? null : Number(rule.value) }] }); setRule({ ...rule, value: "", message: "" }); }}>Add rule</button>
          </div>
          <div style={{ ...row, marginTop: 12 }}>
            <button type="button" style={primaryButton} disabled={busy} onClick={save}>Save scorecard</button>
            <button type="button" style={secondaryButton} disabled={busy} onClick={() => { if (window.confirm("Go back to the default scorecard?")) void run(async () => { const r = await api.post<any>("/api/deal-desk/scorecard/reset"); if (r?.config) apply(r.config); }, "Back to the default."); }}>Reset to default</button>
          </div>
        </>
      )}
      <ErrorLine text={err} />
      {msg && <p role="status" style={{ ...muted, color: "var(--ui-text)" }}>{msg}</p>}
    </section>
  );
}
