// BF_PORTAL_v942_BROKER_PAY - Settings > Broker pay (brokerage owner / Admin only), Todd Nov 11 2026: "a way for the
// brokerage owner to input the percentage of the close they pay to each broker, bonus schedule as well". Brokers are paid
// on revenue the brokerage has received, after the referral partner's fee, on the pay schedule chosen here.
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { api } from "@/api";
import { getErrorMessage } from "@/utils/errors";

type Tier = { from: number; pct: number };
type Plan = { user_id: string; split_company_pct: number; split_self_pct: number; tiers: Tier[]; residual_share: boolean; base_monthly: number; draw_monthly: number; manager_user_id: string | null; override_pct: number; active: boolean; starts_on: string };
type Bonus = { id: string; name: string; kind: "per_deal" | "volume_target" | "revenue_target"; amount: number; threshold: number | null; active: boolean };
type Settings = { schedule: "semi_monthly" | "monthly" | "on_receipt"; tier_basis: "revenue" | "funded_volume"; tier_mode: "marginal" | "whole" };
type Person = { id: string; name: string; role: string };

const card: CSSProperties = { border: "1px solid var(--ui-border)", borderRadius: 12, padding: 16, background: "var(--ui-surface-strong)", marginBottom: 16 };
const inp: CSSProperties = { padding: "6px 8px", borderRadius: 8, border: "1px solid var(--ui-border)", background: "var(--ui-surface)", color: "var(--ui-text)", fontSize: 13, width: 90 };
const btn: CSSProperties = { padding: "7px 12px", borderRadius: 8, border: "1px solid #1e3a8a", background: "#1e3a8a", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" };
const plain: CSSProperties = { ...btn, background: "var(--ui-surface)", color: "var(--ui-text)", borderColor: "var(--ui-border)" };
const muted: CSSProperties = { fontSize: 12, color: "var(--ui-text-muted)", margin: "4px 0 0" };
const blank = (userId: string): Plan => ({ user_id: userId, split_company_pct: 0, split_self_pct: 0, tiers: [], residual_share: true, base_monthly: 0, draw_monthly: 0, manager_user_id: null, override_pct: 0, active: true, starts_on: new Date().toISOString().slice(0, 10) });

export default function BrokerPaySettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [plans, setPlans] = useState<Record<string, Plan>>({});
  const [people, setPeople] = useState<Person[]>([]);
  const [bonuses, setBonuses] = useState<Bonus[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [bonus, setBonus] = useState({ name: "", kind: "per_deal", amount: "", threshold: "" });
  const [adj, setAdj] = useState({ user_id: "", pay_date: "", amount: "", reason: "" });

  const load = useCallback(async () => {
    try {
      const r = await api.get<{ settings: Settings; plans: Plan[]; bonuses: Bonus[]; people: Person[] }>("/api/deals/pay-settings");
      setSettings(r.settings); setPeople(r.people ?? []); setBonuses((r.bonuses ?? []).filter((b) => b.active));
      setPlans(Object.fromEntries((r.plans ?? []).map((p) => [p.user_id, p])));
    } catch (e) { setMsg({ ok: false, text: getErrorMessage(e, "Broker pay could not be loaded.") }); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const run = async (fn: () => Promise<unknown>, done: string) => {
    setMsg(null);
    try { await fn(); setMsg({ ok: true, text: done }); await load(); } catch (e) { setMsg({ ok: false, text: getErrorMessage(e, "That could not be saved.") }); }
  };
  if (!settings) return <p style={{ fontSize: 13 }}>{msg?.text ?? "Loading…"}</p>;
  const planFor = (id: string) => plans[id] ?? blank(id);
  const setPlan = (id: string, patch: Partial<Plan>) => setPlans((p) => ({ ...p, [id]: { ...planFor(id), ...patch } }));

  return (
    <div data-testid="broker-pay">
      <section style={card}>
        <h3 style={{ margin: 0, fontSize: 16 }}>How brokers are paid</h3>
        <p style={muted}>Brokers are paid on money the brokerage has received, after the referral partner's fee.</p>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 10, fontSize: 13 }}>
          <label>Pay schedule<br />
            <select aria-label="Pay schedule" style={{ ...inp, width: 300 }} value={settings.schedule} onChange={(e) => setSettings({ ...settings, schedule: e.target.value as Settings["schedule"] })}>
              <option value="semi_monthly">Twice a month (received 1st-15th paid on the last day; 16th-end paid on the 15th)</option>
              <option value="monthly">Monthly (paid on the 15th for last month)</option>
              <option value="on_receipt">As the money arrives</option>
            </select>
          </label>
          <label>Tiers are based on<br />
            <select aria-label="Tiers based on" style={{ ...inp, width: 200 }} value={settings.tier_basis} onChange={(e) => setSettings({ ...settings, tier_basis: e.target.value as Settings["tier_basis"] })}>
              <option value="revenue">Revenue in the pay period</option><option value="funded_volume">Funded volume in the pay period</option>
            </select>
          </label>
          <label>When a broker reaches a higher tier<br />
            <select aria-label="Tier mode" style={{ ...inp, width: 260 }} value={settings.tier_mode} onChange={(e) => setSettings({ ...settings, tier_mode: e.target.value as Settings["tier_mode"] })}>
              <option value="marginal">The higher % applies only above the threshold</option><option value="whole">The higher % applies to the whole period</option>
            </select>
          </label>
        </div>
        <button type="button" style={{ ...btn, marginTop: 10 }} onClick={() => void run(() => api.put("/api/deals/pay-settings", settings), "Pay settings saved.")}>Save</button>
      </section>

      <section style={card}>
        <h3 style={{ margin: 0, fontSize: 16 }}>Each broker</h3>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8, fontSize: 13 }}>
          <thead><tr>{["Broker", "Company leads %", "Self-sourced %", "Residuals", "Base / month", "Draw / month", ""].map((h) => <th key={h} style={{ textAlign: "left", padding: 6, fontSize: 11, color: "var(--ui-text-muted)", borderBottom: "1px solid var(--ui-border)" }}>{h}</th>)}</tr></thead>
          <tbody>
            {people.map((p) => {
              const pl = planFor(p.id);
              return (
                <tr key={p.id} data-testid={`pay-row-${p.id}`} style={{ borderBottom: "1px solid var(--ui-border)", verticalAlign: "top" }}>
                  <td style={{ padding: 6 }}><strong>{p.name}</strong>{!plans[p.id] ? <div style={muted}>No plan yet</div> : null}</td>
                  <td style={{ padding: 6 }}><input aria-label={`Company leads % for ${p.name}`} style={inp} value={pl.split_company_pct} onChange={(e) => setPlan(p.id, { split_company_pct: Number(e.target.value) || 0 })} /></td>
                  <td style={{ padding: 6 }}><input aria-label={`Self-sourced % for ${p.name}`} style={inp} value={pl.split_self_pct} onChange={(e) => setPlan(p.id, { split_self_pct: Number(e.target.value) || 0 })} /></td>
                  <td style={{ padding: 6 }}><label><input type="checkbox" checked={pl.residual_share} onChange={(e) => setPlan(p.id, { residual_share: e.target.checked })} /> Their book</label></td>
                  <td style={{ padding: 6 }}><input aria-label={`Base for ${p.name}`} style={inp} value={pl.base_monthly} onChange={(e) => setPlan(p.id, { base_monthly: Number(e.target.value) || 0 })} /></td>
                  <td style={{ padding: 6 }}><input aria-label={`Draw for ${p.name}`} style={inp} value={pl.draw_monthly} onChange={(e) => setPlan(p.id, { draw_monthly: Number(e.target.value) || 0 })} /></td>
                  <td style={{ padding: 6, whiteSpace: "nowrap" }}>
                    <button type="button" style={plain} onClick={() => setOpen(open === p.id ? null : p.id)}>{open === p.id ? "Less" : "Tiers, manager…"}</button>{" "}
                    <button type="button" style={btn} data-testid={`pay-save-${p.id}`} onClick={() => void run(() => api.put(`/api/deals/pay-plans/${encodeURIComponent(p.id)}`, pl), `${p.name}'s pay saved.`)}>Save</button>
                    {open === p.id ? (
                      <div style={{ marginTop: 8, display: "grid", gap: 6, whiteSpace: "normal", maxWidth: 380 }}>
                        <div style={muted}>Tiers (replace the company-leads % when set; self-sourced deals keep their extra %):</div>
                        {pl.tiers.map((t, i) => (
                          <div key={i} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            From $<input aria-label={`Tier ${i + 1} from`} style={inp} value={t.from} onChange={(e) => setPlan(p.id, { tiers: pl.tiers.map((x, j) => (j === i ? { ...x, from: Number(e.target.value) || 0 } : x)) })} />
                            pays <input aria-label={`Tier ${i + 1} percent`} style={{ ...inp, width: 60 }} value={t.pct} onChange={(e) => setPlan(p.id, { tiers: pl.tiers.map((x, j) => (j === i ? { ...x, pct: Number(e.target.value) || 0 } : x)) })} />%
                            <button type="button" aria-label="Remove tier" style={plain} onClick={() => setPlan(p.id, { tiers: pl.tiers.filter((_, j) => j !== i) })}>✕</button>
                          </div>
                        ))}
                        <button type="button" style={plain} onClick={() => setPlan(p.id, { tiers: [...pl.tiers, { from: pl.tiers.length ? (pl.tiers.at(-1)!.from + 50000) : 0, pct: pl.split_company_pct }] })}>Add tier</button>
                        <label>Manager (gets an override)<br />
                          <select aria-label={`Manager for ${p.name}`} style={{ ...inp, width: 220 }} value={pl.manager_user_id ?? ""} onChange={(e) => setPlan(p.id, { manager_user_id: e.target.value || null })}>
                            <option value="">None</option>{people.filter((x) => x.id !== p.id).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                          </select>
                        </label>
                        <label>Manager override %<br /><input aria-label={`Override for ${p.name}`} style={inp} value={pl.override_pct} onChange={(e) => setPlan(p.id, { override_pct: Number(e.target.value) || 0 })} /></label>
                        <label>Plan starts<br /><input aria-label={`Plan start for ${p.name}`} type="date" style={{ ...inp, width: 150 }} value={pl.starts_on} onChange={(e) => setPlan(p.id, { starts_on: e.target.value })} /></label>
                        <label><input type="checkbox" checked={pl.active} onChange={(e) => setPlan(p.id, { active: e.target.checked })} /> Paid (untick when they leave)</label>
                      </div>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section style={card}>
        <h3 style={{ margin: 0, fontSize: 16 }}>Bonuses</h3>
        {bonuses.length === 0 ? <p style={muted}>No bonuses yet.</p> : (
          <ul style={{ fontSize: 13, paddingLeft: 18 }}>
            {bonuses.map((b) => (
              <li key={b.id}>{b.name}: ${b.amount.toLocaleString("en-CA")} {b.kind === "per_deal" ? "per funded deal" : b.kind === "volume_target" ? `when funded volume reaches $${(b.threshold ?? 0).toLocaleString("en-CA")} in a pay period` : `when revenue reaches $${(b.threshold ?? 0).toLocaleString("en-CA")} in a pay period`}{" "}
                <button type="button" style={plain} onClick={() => void run(() => api.delete(`/api/deals/bonus-rules/${encodeURIComponent(b.id)}`), "Bonus removed.")}>Remove</button>
              </li>
            ))}
          </ul>
        )}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end", fontSize: 13 }}>
          <label>Name<br /><input aria-label="Bonus name" style={{ ...inp, width: 180 }} value={bonus.name} onChange={(e) => setBonus({ ...bonus, name: e.target.value })} /></label>
          <label>For<br />
            <select aria-label="Bonus for" style={{ ...inp, width: 200 }} value={bonus.kind} onChange={(e) => setBonus({ ...bonus, kind: e.target.value })}>
              <option value="per_deal">Each funded deal</option><option value="volume_target">Reaching a funded volume</option><option value="revenue_target">Reaching a revenue target</option>
            </select>
          </label>
          <label>Amount ($)<br /><input aria-label="Bonus amount" style={inp} value={bonus.amount} onChange={(e) => setBonus({ ...bonus, amount: e.target.value })} /></label>
          {bonus.kind !== "per_deal" ? <label>Target ($)<br /><input aria-label="Bonus target" style={inp} value={bonus.threshold} onChange={(e) => setBonus({ ...bonus, threshold: e.target.value })} /></label> : null}
          <button type="button" style={btn} onClick={() => void run(async () => { await api.post("/api/deals/bonus-rules", bonus); setBonus({ name: "", kind: "per_deal", amount: "", threshold: "" }); }, "Bonus added.")}>Add bonus</button>
        </div>
      </section>

      <section style={card}>
        <h3 style={{ margin: 0, fontSize: 16 }}>One-off adjustment</h3>
        <p style={muted}>A contest prize, a correction, a deduction (use a minus amount).</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end", fontSize: 13, marginTop: 6 }}>
          <label>Broker<br /><select aria-label="Adjustment broker" style={{ ...inp, width: 180 }} value={adj.user_id} onChange={(e) => setAdj({ ...adj, user_id: e.target.value })}><option value="">Choose…</option>{people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
          <label>Pay date<br /><input aria-label="Adjustment pay date" type="date" style={{ ...inp, width: 150 }} value={adj.pay_date} onChange={(e) => setAdj({ ...adj, pay_date: e.target.value })} /></label>
          <label>Amount ($)<br /><input aria-label="Adjustment amount" style={inp} value={adj.amount} onChange={(e) => setAdj({ ...adj, amount: e.target.value })} /></label>
          <label>Reason<br /><input aria-label="Adjustment reason" style={{ ...inp, width: 220 }} value={adj.reason} onChange={(e) => setAdj({ ...adj, reason: e.target.value })} /></label>
          <button type="button" style={btn} onClick={() => void run(async () => { await api.post("/api/deals/adjustments", adj); setAdj({ user_id: "", pay_date: "", amount: "", reason: "" }); }, "Adjustment added.")}>Add</button>
        </div>
      </section>
      {msg ? <p role={msg.ok ? "status" : "alert"} style={{ fontSize: 13, color: msg.ok ? "#166534" : "#b91c1c" }}>{msg.text}</p> : null}
    </div>
  );
}
