// BF_PORTAL_ONE_COMMISSION_v727
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { renderReport } from "../ReportDataCards";

describe("forecast matches the Dashboard", () => {
  it("shows commission if every file funds (the Dashboard figure) and the weighted expectation", () => {
    render(<>{renderReport("revenue_forecast", { total: 1200, full_total: 3000, stages: [{ stage: "Off to Lender", files: 2, amount: 100000, full_commission: 3000, odds: 0.4, expected_commission: 1200 }] })}</>);
    expect(screen.getByText(/matches the Dashboard/)).toBeTruthy();
    expect(screen.getAllByText("$3,000").length).toBeGreaterThan(0);
  });
  it("commission by month no longer claims a flat 3%", () => {
    render(<>{renderReport("commission_by_month", { months: [] })}</>);
    expect(screen.queryByText(/3\.0%/)).toBeNull();
  });
});
