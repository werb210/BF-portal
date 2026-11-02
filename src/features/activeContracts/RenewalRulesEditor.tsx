// BF_PORTAL_v864_ACTIVE_CONTRACTS - renewal rules on the Lender Product: each product sets its own trigger
// (percentage paid down, months before maturity, specific date, manual, not renewable). Saved on its own.
import { useEffect, useState } from "react";
import { acApi, errorText } from "./api";
import { Btn, ErrorLine, Field, input, muted } from "./ui";

export default function RenewalRulesEditor({ productId, category }: { productId: string; category?: string }) {
  const [rule, setRule] = useState<Record<string, string>>({ rule_type: "" });
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    acApi.rule(productId).then((r) => {
      if (!alive) return;
      const x = r.rule;
      setRule(x ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, v == null ? "" : String(v)])) : { rule_type: "" });
    }).catch((e) => { if (alive) setErr(errorText(e)); });
    return () => { alive = false; };
  }, [productId]);
  const save = async () => {
    setErr(null); setMsg(null);
    try { await acApi.saveRule(productId, rule); setMsg("Renewal rule saved."); } catch (e) { setErr(errorText(e)); }
  };
  const t = rule.rule_type;
  const hint = String(category ?? "").toUpperCase() === "MCA" ? "Example: eligible after 50% of the advance is repaid." : "Example: outreach starts 3 months (90 days) before maturity.";
  return (
    <div data-testid="renewal-rules-editor" style={{ border: "1px solid var(--ui-border)", borderRadius: 8, padding: 12, margin: "10px 0" }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: "var(--ui-text)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px" }}>Renewal rules (Active Contracts)</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-end" }}>
        <Field label="Renewal trigger">
          <select style={input} value={t} onChange={(e) => setRule({ ...rule, rule_type: e.target.value })}>
            <option value="">Not set (starting default for the product type)</option>
            <option value="percent_paid">Percentage paid down</option>
            <option value="months_before_maturity">Months before maturity</option>
            <option value="specific_date">Specific eligibility date</option>
            <option value="manual">Manual</option>
            <option value="not_renewable">Not renewable</option>
          </select>
        </Field>
        {t === "percent_paid" ? <>
          <Field label="Eligible after % repaid"><input style={{ ...input, width: 90 }} type="number" value={rule.percent_threshold ?? ""} onChange={(e) => setRule({ ...rule, percent_threshold: e.target.value })} /></Field>
          <Field label="'Upcoming' this many points before"><input style={{ ...input, width: 90 }} type="number" value={rule.approach_points ?? "10"} onChange={(e) => setRule({ ...rule, approach_points: e.target.value })} /></Field>
        </> : null}
        {t === "months_before_maturity" ? <Field label="Months before maturity"><input style={{ ...input, width: 90 }} type="number" value={rule.months_before_maturity ?? ""} onChange={(e) => setRule({ ...rule, months_before_maturity: e.target.value })} /></Field> : null}
        {t === "specific_date" ? <Field label="Eligible this many months after funding"><input style={{ ...input, width: 90 }} type="number" value={rule.eligible_after_months ?? ""} onChange={(e) => setRule({ ...rule, eligible_after_months: e.target.value })} /></Field> : null}
        <Field label="Notes (e.g. replacement or additional equipment)"><input style={{ ...input, minWidth: 220 }} value={rule.notes ?? ""} onChange={(e) => setRule({ ...rule, notes: e.target.value })} /></Field>
        <Btn disabled={!t} onClick={() => void save()}>Save renewal rule</Btn>
      </div>
      <div style={{ ...muted, marginTop: 6 }}>{msg ?? hint}</div>
      <ErrorLine text={err} />
    </div>
  );
}
