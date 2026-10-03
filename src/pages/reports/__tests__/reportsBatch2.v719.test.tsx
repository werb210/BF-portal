// BF_PORTAL_REPORTS_BATCH2_v719
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { renderReport } from "../ReportDataCards";

describe("batch 2 report cards", () => {
  it("revenue forecast", () => {
    render(<>{renderReport("revenue_forecast", { total: 1200, full_total: 3000, stages: [{ stage: "Off to Lender", files: 2, amount: 100000, full_commission: 3000, odds: 0.4, expected_commission: 1200 }] })}</>);
    expect(screen.getByText("Off to Lender")).toBeTruthy();
    expect(screen.getByText("40%")).toBeTruthy();
  });
  it("missed calls", () => {
    render(<>{renderReport("missed_calls", { days: 14, missed: 2, not_called_back: 1, items: [{ created_at: "2026-10-01T15:00:00Z", caller: "+14035550101", minutes_to_callback: null }, { created_at: "2026-10-01T16:00:00Z", caller: "+14035550102", minutes_to_callback: 12 }] })}</>);
    expect(screen.getByText("Not yet")).toBeTruthy();
    expect(screen.getByText("after 12 min")).toBeTruthy();
  });
  it("staff activity, cohorts, payouts, media fees, renewals, cross-sell all render", () => {
    const cases: Array<[string, any, string]> = [
      ["staff_activity", { days: 7, own: true, staff: [{ staff: "Andrew P", outbound: 5, inbound: 2, connected: 4, talk_minutes: 30 }] }, "Andrew P"],
      ["monthly_cohorts", { months: [{ month: "2026-09", started: 10, submitted: 5, funded: 1 }] }, "2026-09"],
      ["payouts_owed", { unpaid: 1, items: [{ name: "Acme", broker_name: "Avance", broker_pct: 50, funded_amount: 100000, payout_paid_on: null }] }, "Not paid"],
      ["media_fee_agreements", { signed: 0, waiting: 1, items: [{ name: "Film Co", lender: "Bondit", status: "pending", signer_name: "Jo", fee_2pct: 2000 }] }, "Film Co"],
      ["renewal_opportunities", { items: [{ application_id: "a1", name: "Old Client", product_category: "LOC", funded_amount: 50000, funded_at: "2025-10-01T00:00:00Z" }] }, "Old Client"],
    ];
    for (const [key, data, text] of cases) {
      const { unmount } = render(<>{renderReport(key, data)}</>);
      expect(screen.getByText(text)).toBeTruthy();
      unmount();
    }
    render(<>{renderReport("insurance_cross_sell", { days: 365, funded: 10, with_insurance: 3 })}</>);
    expect(screen.getByText(/30%/)).toBeTruthy();
  });
});
