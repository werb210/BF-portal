// BF_PORTAL_v940_LENDER_PRODUCT_RULES
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import ProductRulesFields, { rulesFormFrom, rulesPayload, type RulesForm } from "../ProductRulesFields";

function Harness({ onChange }: { onChange: (f: RulesForm) => void }) {
  const [f, setF] = useState(rulesFormFrom({}));
  return <ProductRulesFields form={f} set={(k, v) => setF((x) => { const n = { ...x, [k]: v }; onChange(n); return n; })} />;
}

describe("lender product rules", () => {
  it("loads saved rules and the older commission %", () => {
    const f = rulesFormFrom({ matchRules: { max_nsf_per_month: 3, max_funding_multiple: 1.5 }, commission: 2 });
    expect(f).toMatchObject({ maxNsfPerMonth: "3", maxFundingMultiple: "1.5", commissionKind: "percent", commissionPercent: "2" });
  });

  it("sends knock-outs and a profit share", () => {
    let last: RulesForm = rulesFormFrom({});
    render(<Harness onChange={(f) => { last = f; }} />);
    fireEvent.change(screen.getByLabelText("Max NSFs per month (average)"), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("Funds up to (x monthly revenue)"), { target: { value: "1.5" } });
    expect(screen.getByText(/can be funded up to \$15,000/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Commission type"), { target: { value: "profit_share" } });
    fireEvent.change(screen.getByLabelText("% of the lender's profit"), { target: { value: "10" } });
    const p = rulesPayload(last);
    expect(p.matchRules).toMatchObject({ max_nsf_per_month: 3, max_funding_multiple: 1.5, min_monthly_revenue: null });
    expect(p.commissionTerms).toMatchObject({ kind: "profit_share", share_percent: 10 });
    expect(p.commission).toBeNull();
  });
});
