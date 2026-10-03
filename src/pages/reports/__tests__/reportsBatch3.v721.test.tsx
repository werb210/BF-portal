// BF_PORTAL_REPORTS_BATCH3_v721
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { renderReport } from "../ReportDataCards";

describe("batch 3 report cards", () => {
  it("best lender by deal type", () => {
    render(<>{renderReport("best_lender_by_deal_type", { types: [{ deal_type: "Equipment", top: { lender: "Acme Leasing", funded: 3, amount: 300000 }, lenders: [{ lender: "Acme Leasing", funded: 3 }, { lender: "B Bank", funded: 1 }] }] })}</>);
    expect(screen.getByText("Acme Leasing")).toBeTruthy();
    expect(screen.getByText("B Bank (1)")).toBeTruthy();
  });
  it("consent health", () => {
    render(<>{renderReport("consent_health", { contacts: 100, express_sms: 10, implied_client: 20, implied_inquiry: 5, opted_out_marketing: 3, opted_out_sms: 4, expiring_30_days: 7 })}</>);
    expect(screen.getByText("7")).toBeTruthy();
    expect(screen.getByText("Can be texted: applicants (6 months)")).toBeTruthy();
  });
});
