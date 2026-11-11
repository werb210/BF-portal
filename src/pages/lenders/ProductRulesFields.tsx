// BF_PORTAL_v940_LENDER_PRODUCT_RULES - on a lender product (Todd, Nov 11 2026):
//   Who this lender will see - knock-outs checked against the file (banking analysis and application). A file that
//   breaks one is not shown to this lender. Empty = not checked.
//   How the lender pays us - a set amount, a % of the funded amount, or a share of the lender's profit each month.
//   These become the starting revenue lines on the Close tab.
import type { CSSProperties } from "react";

export type RulesForm = {
  maxNsfPerMonth: string; minMonthlyRevenue: string; maxFundingMultiple: string; minAvgDailyBalance: string;
  maxPositions: string; minMonthsInBusiness: string;
  commissionKind: "" | "flat" | "percent" | "profit_share"; commissionAmount: string; commissionPercent: string;
  sharePercent: string; shareMonths: string; clawbackDays: string;
};

const s = (v: unknown) => (v === null || v === undefined ? "" : String(v));

export function rulesFormFrom(product: Record<string, any> | null | undefined): RulesForm {
  const r = (product?.matchRules ?? product?.match_rules ?? {}) as Record<string, unknown>;
  const c = (product?.commissionTerms ?? product?.commission_terms ?? {}) as Record<string, unknown>;
  const legacyPercent = product?.commission != null && Number(product.commission) > 0 ? String(product.commission) : "";
  const kind = (["flat", "percent", "profit_share"].includes(String(c.kind)) ? c.kind : legacyPercent ? "percent" : "") as RulesForm["commissionKind"];
  return {
    maxNsfPerMonth: s(r.max_nsf_per_month), minMonthlyRevenue: s(r.min_monthly_revenue), maxFundingMultiple: s(r.max_funding_multiple),
    minAvgDailyBalance: s(r.min_avg_daily_balance), maxPositions: s(r.max_positions), minMonthsInBusiness: s(r.min_months_in_business),
    commissionKind: kind, commissionAmount: s(c.amount), commissionPercent: s(c.percent) || legacyPercent,
    sharePercent: s(c.share_percent), shareMonths: s(c.share_months), clawbackDays: s(c.clawback_days),
  };
}

const n = (v: string) => (v.trim() === "" ? null : Number(v.replace(/[$,%\s]/g, "")));

/** What the product save sends (BF-Server v940 saves matchRules and commissionTerms after the product). */
export function rulesPayload(f: RulesForm) {
  return {
    matchRules: {
      max_nsf_per_month: n(f.maxNsfPerMonth), min_monthly_revenue: n(f.minMonthlyRevenue), max_funding_multiple: n(f.maxFundingMultiple),
      min_avg_daily_balance: n(f.minAvgDailyBalance), max_positions: n(f.maxPositions), min_months_in_business: n(f.minMonthsInBusiness),
    },
    commissionTerms: {
      kind: f.commissionKind || null, amount: n(f.commissionAmount), percent: n(f.commissionPercent),
      share_percent: n(f.sharePercent), share_months: n(f.shareMonths), clawback_days: n(f.clawbackDays),
    },
    // The older single commission % stays filled for reports that read it.
    commission: f.commissionKind === "percent" ? n(f.commissionPercent) : null,
  };
}

const box: CSSProperties = { border: "1px solid var(--ui-border)", borderRadius: 10, padding: 14, display: "grid", gap: 12 };
const grid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 };
const label: CSSProperties = { fontSize: 13, fontWeight: 600, color: "var(--ui-text)", display: "block", marginBottom: 6 };
const hint: CSSProperties = { fontSize: 12, color: "var(--ui-text-muted)", margin: 0 };
const input: CSSProperties = { width: "100%", padding: "10px 14px", border: "1px solid var(--ui-border)", borderRadius: 8, fontSize: 14, boxSizing: "border-box", color: "var(--ui-text)", background: "var(--ui-surface-strong)" };

function Field({ id, title, value, onChange, placeholder }: { id: string; title: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label style={label} htmlFor={id}>{title}</label>
      <input id={id} aria-label={title} inputMode="decimal" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} style={input} />
    </div>
  );
}

export default function ProductRulesFields({ form, set }: { form: RulesForm; set: (key: keyof RulesForm, value: string) => void }) {
  return (
    <>
      <div style={box} data-testid="product-knockouts">
        <div>
          <strong style={{ fontSize: 14 }}>Who this lender will see</strong>
          <p style={hint}>A file that breaks any of these is not shown to this lender. Leave blank to skip. NSFs, balances and other lenders come from the banking analysis.</p>
        </div>
        <div style={grid}>
          <Field id="r-nsf" title="Max NSFs per month (average)" value={form.maxNsfPerMonth} onChange={(v) => set("maxNsfPerMonth", v)} placeholder="e.g. 3" />
          <Field id="r-rev" title="Min average monthly revenue ($)" value={form.minMonthlyRevenue} onChange={(v) => set("minMonthlyRevenue", v)} placeholder="e.g. 10000" />
          <Field id="r-mult" title="Funds up to (x monthly revenue)" value={form.maxFundingMultiple} onChange={(v) => set("maxFundingMultiple", v)} placeholder="e.g. 1.5" />
          <Field id="r-adb" title="Min average daily balance ($)" value={form.minAvgDailyBalance} onChange={(v) => set("minAvgDailyBalance", v)} placeholder="e.g. 2500" />
          <Field id="r-pos" title="Max other lenders being paid" value={form.maxPositions} onChange={(v) => set("maxPositions", v)} placeholder="e.g. 2" />
          <Field id="r-tib" title="Min months in business" value={form.minMonthsInBusiness} onChange={(v) => set("minMonthsInBusiness", v)} placeholder="e.g. 12" />
        </div>
        {form.maxFundingMultiple ? <p style={hint}>Example: a business with $10,000 a month in revenue can be funded up to ${Math.round(10000 * (Number(form.maxFundingMultiple) || 0)).toLocaleString("en-CA")}.</p> : null}
      </div>

      <div style={box} data-testid="product-commission">
        <div>
          <strong style={{ fontSize: 14 }}>How this lender pays us</strong>
          <p style={hint}>Used as the starting revenue on the Close tab. Internal only.</p>
        </div>
        <div style={grid}>
          <div>
            <label style={label} htmlFor="c-kind">Commission type</label>
            <select id="c-kind" aria-label="Commission type" value={form.commissionKind} onChange={(e) => set("commissionKind", e.target.value)} style={input}>
              <option value="">Not set</option>
              <option value="flat">Set amount</option>
              <option value="percent">% of the funded amount</option>
              <option value="profit_share">Share of the lender's profit each month</option>
            </select>
          </div>
          {form.commissionKind === "flat" ? <Field id="c-amt" title="Amount ($)" value={form.commissionAmount} onChange={(v) => set("commissionAmount", v)} placeholder="e.g. 1500" /> : null}
          {form.commissionKind === "percent" ? <Field id="c-pct" title="% of funded amount" value={form.commissionPercent} onChange={(v) => set("commissionPercent", v)} placeholder="e.g. 2" /> : null}
          {form.commissionKind === "profit_share" ? <>
            <Field id="c-share" title="% of the lender's profit" value={form.sharePercent} onChange={(v) => set("sharePercent", v)} placeholder="e.g. 10" />
            <Field id="c-months" title="For how many months (blank = life of the deal)" value={form.shareMonths} onChange={(v) => set("shareMonths", v)} placeholder="e.g. 36" />
          </> : null}
          {form.commissionKind ? <Field id="c-claw" title="Clawback window (days)" value={form.clawbackDays} onChange={(v) => set("clawbackDays", v)} placeholder="e.g. 30" /> : null}
        </div>
      </div>
    </>
  );
}
