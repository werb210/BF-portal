// BF_PORTAL_v874_MARKETING_TOOLS - Marketing > Lead scoring (ported from KS-Portal #42 without the Marketing add-on):
// the highest-scoring contacts of the silo chosen in the topbar, and the rules and points the score is worked out from
// (Admins and Marketing users can change them; each silo has its own).
import { useEffect, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { api } from "@/api";
import { serverMessage, unwrap } from "@/components/marketing/marketingTools";
import { LeadScoreBadge } from "@/components/marketing/LeadScore";

type Rule = { kind: string; value?: string | null; points: number };
type Weight = { points: number; cap: number };
type Settings = { rules: Rule[]; engagement: Record<string, Weight>; hot: number; warm: number };
type SettingsResponse = { settings: Settings; engagement_labels: Record<string, string> };
type TopRow = { contact_id: string; score: number; name: string | null; email: string | null; company_name: string | null };

export const RULE_LABELS: Record<string, string> = {
  has_phone: "Has a phone number",
  has_company: "Has a business on file",
  owner_title: "Owner or executive title",
  tag: "Has the tag",
  lifecycle_stage: "Lifecycle stage is",
  lead_status: "Lead status is",
  amount_at_least: "Asked for at least ($)",
};
const NEEDS_VALUE = new Set(["tag", "lifecycle_stage", "lead_status", "amount_at_least"]);
const input: CSSProperties = { color: "var(--ui-text)", background: "var(--ui-surface-strong)", borderColor: "var(--ui-border)" };

export default function LeadScoringPanel() {
  const [top, setTop] = useState<TopRow[] | null>(null);
  const [cfg, setCfg] = useState<SettingsResponse | null>(null);
  const [cfgError, setCfgError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [thresholds, setThresholds] = useState<{ hot: number; warm: number }>({ hot: 70, warm: 40 });

  useEffect(() => {
    api.get<{ contacts?: TopRow[]; hot?: number; warm?: number }>("/api/lead-scores/top?limit=25")
      .then((r) => { const d = unwrap<{ contacts?: TopRow[]; hot?: number; warm?: number }>(r); setTop(d.contacts ?? []); setThresholds({ hot: d.hot ?? 70, warm: d.warm ?? 40 }); })
      .catch(() => setTop([]));
    api.get<SettingsResponse>("/api/lead-scores/settings")
      .then((r) => setCfg(unwrap<SettingsResponse>(r)))
      .catch((e) => setCfgError(serverMessage(e, "Only Admins and Marketing users can change the scoring rules.")));
  }, []);

  const setRule = (i: number, patch: Partial<Rule>) => setCfg((c) => (c ? { ...c, settings: { ...c.settings, rules: c.settings.rules.map((r, j) => (j === i ? { ...r, ...patch } : r)) } } : c));
  const save = async () => {
    if (!cfg) return;
    setBusy(true); setMsg(null);
    try {
      const r = unwrap<{ settings: Settings }>(await api.put("/api/lead-scores/settings", { settings: cfg.settings }));
      setCfg({ ...cfg, settings: r.settings });
      setMsg("Saved. Scores update within 30 minutes, and straight away when a contact is opened.");
    } catch (e) { setMsg(serverMessage(e, "Could not save the rules.")); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-4" data-testid="lead-scoring">
      {/* BF_PORTAL_v947_BROKERAGE_SETUP - rules only. The score itself shows on every contact in the CRM. */}
      <p data-testid="lead-scoring-intro" style={{ color: "var(--ui-text-muted)", fontSize: 14, margin: 0 }}>
        Every contact gets a score from 0 to 100, shown beside their name in the CRM: who they are plus what they did in the last 90 days. These rules apply to the whole brokerage.
      </p>
      <section className="drawer-section">
        <div className="drawer-section__title mb-2">How the score is worked out</div>
        {cfgError && <p style={{ color: "var(--ui-text)", fontSize: 13 }}>{cfgError}</p>}
        {cfg && (
          <div className="space-y-3 text-sm" style={{ color: "var(--ui-text)" }}>
            <fieldset>
              <legend className="font-medium">Who they are</legend>
              {cfg.settings.rules.map((r, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2 mb-1">
                  <select aria-label="Rule" value={r.kind} onChange={(e) => setRule(i, { kind: e.target.value })} className="border rounded px-2 py-1" style={input}>
                    {Object.entries(RULE_LABELS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                  </select>
                  {NEEDS_VALUE.has(r.kind) && <input aria-label="Value" value={r.value ?? ""} onChange={(e) => setRule(i, { value: e.target.value })} className="border rounded px-2 py-1" style={input} />}
                  <input aria-label="Points" type="number" min={-50} max={50} value={r.points} onChange={(e) => setRule(i, { points: Number(e.target.value) })} className="border rounded px-2 py-1 w-20" style={input} />
                  <span>points</span>
                  <button type="button" className="ui-button ui-button--secondary" onClick={() => setCfg((c) => (c ? { ...c, settings: { ...c.settings, rules: c.settings.rules.filter((_, j) => j !== i) } } : c))}>Remove</button>
                </div>
              ))}
              <button type="button" className="ui-button ui-button--secondary" onClick={() => setCfg((c) => (c ? { ...c, settings: { ...c.settings, rules: [...c.settings.rules, { kind: "tag", value: "", points: 10 }] } } : c))}>Add a rule</button>
            </fieldset>
            <fieldset>
              <legend className="font-medium">What they did (last 90 days; older than 30 days counts half)</legend>
              {Object.entries(cfg.settings.engagement).map(([k, w]) => (
                <div key={k} className="flex flex-wrap items-center gap-2 mb-1">
                  <span style={{ minWidth: 210 }}>{cfg.engagement_labels[k] ?? k}</span>
                  <input aria-label={`${cfg.engagement_labels[k] ?? k} points`} type="number" min={0} max={50} value={w.points} onChange={(e) => setCfg((c) => (c ? { ...c, settings: { ...c.settings, engagement: { ...c.settings.engagement, [k]: { ...w, points: Number(e.target.value) } } } } : c))} className="border rounded px-2 py-1 w-20" style={input} />
                  <span>points each, at most</span>
                  <input aria-label={`${cfg.engagement_labels[k] ?? k} cap`} type="number" min={0} max={100} value={w.cap} onChange={(e) => setCfg((c) => (c ? { ...c, settings: { ...c.settings, engagement: { ...c.settings.engagement, [k]: { ...w, cap: Number(e.target.value) } } } } : c))} className="border rounded px-2 py-1 w-20" style={input} />
                </div>
              ))}
            </fieldset>
            <div className="flex flex-wrap items-center gap-2">
              <label>Hot from <input aria-label="Hot from" type="number" min={1} max={100} value={cfg.settings.hot} onChange={(e) => setCfg({ ...cfg, settings: { ...cfg.settings, hot: Number(e.target.value) } })} className="border rounded px-2 py-1 w-20" style={input} /></label>
              <label>Warm from <input aria-label="Warm from" type="number" min={0} max={100} value={cfg.settings.warm} onChange={(e) => setCfg({ ...cfg, settings: { ...cfg.settings, warm: Number(e.target.value) } })} className="border rounded px-2 py-1 w-20" style={input} /></label>
              <button type="button" className="ui-button ui-button--primary" disabled={busy} onClick={() => void save()}>Save rules</button>
            </div>
            {msg && <p role="status">{msg}</p>}
          </div>
        )}
      </section>
    </div>
  );
}
