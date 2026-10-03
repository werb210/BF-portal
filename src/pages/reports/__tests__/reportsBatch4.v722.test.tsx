// BF_PORTAL_REPORTS_BATCH4_v722
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { renderReport } from "../ReportDataCards";

describe("batch 4 report cards", () => {
  it("decline reasons", () => {
    render(<>{renderReport("decline_reasons", { days: 365, reasons: [{ reason: "Time in business too short", times: 4, files: 3, whole_file: 1, lenders: "Acme" }] })}</>);
    expect(screen.getByText("Time in business too short")).toBeTruthy();
  });
  it("document turnaround shows hours under two days and days after", () => {
    render(<>{renderReport("document_turnaround", { days: 180, categories: [{ category: "bank_statements", requested: 5, received: 4, outstanding: 1, rejected: 0, median_hours: 30 }, { category: "tax_returns", requested: 3, received: 2, outstanding: 1, rejected: 1, median_hours: 96 }] })}</>);
    expect(screen.getByText("30 h")).toBeTruthy();
    expect(screen.getByText("4 days")).toBeTruthy();
  });
});
