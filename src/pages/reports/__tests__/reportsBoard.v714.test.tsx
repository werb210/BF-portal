// BF_PORTAL_REPORTS_SECTION_v714
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const get = vi.fn();
const put = vi.fn();
vi.mock("@/api", () => ({ api: { get: (...a: unknown[]) => get(...a), put: (...a: unknown[]) => put(...a) } }));
vi.mock("@/components/marketing/GoogleAdsAnalytics", () => ({ AdsStoryPanel: () => <div>story</div>, DropoffPanel: () => <div>dropoff</div>, VisitorsPanel: () => <div>visitors</div> }));
vi.mock("@/silos/bi/dashboard/BIDashboard", () => ({ default: () => <div>bi</div> }));

import ReportsBoard, { moveCard, moveTab, type Tab } from "../ReportsBoard";
import { renderReport } from "../ReportDataCards";

const tabs: Tab[] = [
  { id: "t1", name: "Money", cards: [{ id: "a", report: "stuck_deals", size: "full" }, { id: "b", report: "speed_to_lead", size: "half" }] },
  { id: "t2", name: "Team", cards: [] },
];

describe("moving cards and tabs", () => {
  it("reorders a card within a tab", () => expect(moveCard(tabs, "t1", "b", "t1", "a")[0]!.cards.map((c) => c.id)).toEqual(["b", "a"]));
  it("moves a card to another tab", () => { const out = moveCard(tabs, "t1", "a", "t2", null); expect(out[0]!.cards.map((c) => c.id)).toEqual(["b"]); expect(out[1]!.cards.map((c) => c.id)).toEqual(["a"]); });
  it("reorders tabs", () => expect(moveTab(tabs, "t2", "t1").map((t) => t.id)).toEqual(["t2", "t1"]));
});

describe("Reports board", () => {
  beforeEach(() => {
    get.mockReset(); put.mockReset(); put.mockResolvedValue({ ok: true });
    get.mockImplementation(async (url: string) => {
      if (url.startsWith("/api/reports/catalog")) return { reports: [{ key: "stuck_deals", title: "Stuck deals", silo: "BF", group: "operations", size: "full", description: "d" }] };
      if (url.startsWith("/api/reports/layouts")) return { tabs: [], dashboard: null, teamTabs: [], canPublishTeamTabs: false };
      return { threshold: 7, stuck: 0, items: [] };
    });
  });
  it("offers only the reports the server allows, and saves a card when added", async () => {
    render(<ReportsBoard />); fireEvent.click(await screen.findByTestId("reports-add"));
    expect((await screen.findByTestId("reports-library")).textContent).toContain("Stuck deals");
    fireEvent.click(screen.getByText("Stuck deals")); await waitFor(() => expect(put).toHaveBeenCalled());
    expect((put.mock.calls[0]![1] as any).tabs[0].cards[0].report).toBe("stuck_deals");
    expect(await screen.findByTestId("report-card-stuck_deals")).toBeTruthy();
  });
  it("can send a card to the Dashboard", async () => {
    get.mockImplementation(async (url: string) => {
      if (url.startsWith("/api/reports/catalog")) return { reports: [] };
      if (url.startsWith("/api/reports/layouts")) return { tabs: [{ id: "t1", name: "Mine", cards: [{ id: "a", report: "stuck_deals", size: "full" }] }], dashboard: null, teamTabs: [], canPublishTeamTabs: false };
      return { threshold: 7, stuck: 0, items: [] };
    });
    render(<ReportsBoard />); fireEvent.click(await screen.findByLabelText("Card options")); fireEvent.click(screen.getByText("Add to Dashboard"));
    await waitFor(() => expect(put).toHaveBeenCalled()); expect((put.mock.calls[0]![1] as any).dashboard.cards[0].report).toBe("stuck_deals");
  });
});

describe("cards and wiring", () => {
  it("renders the new report data", () => { render(<>{renderReport("lender_scorecard", { lenders: [{ lender: "Acme", sent: 4, offers: 2, funded: 1, days_to_offer: 3.5 }] })}</>); expect(screen.getByText("Acme")).toBeTruthy(); });
});
