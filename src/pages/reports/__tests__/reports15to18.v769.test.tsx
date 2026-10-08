// BF_PORTAL_REPORTS15_18_v769
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
const { get, apiFn } = vi.hoisted(() => {
  const get = vi.fn();
  const apiFn: any = vi.fn();
  apiFn.get = (...a: unknown[]) => get(...a);
  return { get, apiFn };
});
vi.mock("@/api", () => ({ api: apiFn }));
import { renderReport } from "../ReportDataCards";
import BIInsuranceReports from "../BIInsuranceReports";

const MENU = { applications: { groups: ["stage", "product"], measures: ["count", "amount"] }, tasks: { groups: ["status", "assignee"], measures: ["count", "overdue"] } };
beforeEach(() => { get.mockReset(); apiFn.mockReset(); localStorage.clear(); });

describe("reports 15-18 cards", () => {
  it("pipeline snapshot compares a chosen past day with today", async () => {
    get.mockResolvedValue({ date: "2026-10-01", today: "2026-10-09", dates: ["2026-10-09", "2026-10-01"], note: "", rows: [{ stage: "In Review", then_files: 1, then_amount: 1000, now_files: 2, now_amount: 5000 }] });
    render(<div>{renderReport("pipeline_snapshot", { date: "2026-10-09", today: "2026-10-09", dates: ["2026-10-09", "2026-10-01"], note: "", rows: [] })}</div>);
    fireEvent.change(screen.getByTestId("snapshot-date"), { target: { value: "2026-10-01" } });
    await waitFor(() => expect(get).toHaveBeenCalledWith("/api/reports/data/pipeline_snapshot?date=2026-10-01"));
    expect(await screen.findByText("In Review")).toBeTruthy();
  });
  it("issues", () => {
    render(<div>{renderReport("issues_report", { days: 180, note: "", byMonth: [{ label: "2026-10", opened: 5, resolved: 3, median_days: 1.5 }], open: [{ label: "bug", open: 2, in_progress: 1, oldest_days: 9 }] })}</div>);
    expect(screen.getByText("1.5 d")).toBeTruthy(); expect(screen.getByText("bug")).toBeTruthy();
  });
  it("custom report builder asks the server for the chosen record type and remembers it", async () => {
    get.mockResolvedValue({ menu: MENU, rows: [{ label: "Todd", value: 3 }] });
    render(<div>{renderReport("custom_report", { entity: "applications", groupBy: "stage", measure: "count", menu: MENU, rows: [] })}</div>);
    fireEvent.change(screen.getByTestId("custom-entity"), { target: { value: "tasks" } });
    await waitFor(() => expect(get).toHaveBeenCalledWith("/api/reports/data/custom_report?entity=tasks&groupBy=status&measure=count&days=90"));
    expect(await screen.findByText("Todd")).toBeTruthy();
    expect(JSON.parse(localStorage.getItem("bf_custom_report_v769") ?? "{}")).toMatchObject({ entity: "tasks" });
  });
  it("Insurance reports come from BI-Server", async () => {
    apiFn.mockResolvedValue({ status: "ok", data: { days: 365, note: "", referrers: [{ label: "Jane Broker", applications: 3, policies: 1, premium: 1200, commission: 240 }], turnaround: [], premium: [] } });
    render(<BIInsuranceReports />);
    expect(await screen.findByText("Jane Broker")).toBeTruthy();
    expect(apiFn).toHaveBeenCalledWith("/api/v1/bi/reports/insurance?days=365");
    expect(readFileSync("src/pages/reports/ReportsBoard.tsx", "utf8")).toContain('if (report === "bi_insurance") return <BIInsuranceReports />;');
  });
});
