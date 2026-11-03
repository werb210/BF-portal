// BF_PORTAL_v884_SERVER_FIELDS - the portal shows the fields BF-Server v885 adds when they are there, and nothing new
// when they are not (so it works before and after that deploy): dashboard definitions and a proportional funnel, the
// fraud score's "based on N of M checks" and queue message, the credit summary signer, the campaign tracking note.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const h = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }));
vi.mock("@/api", () => ({ api: { get: h.get, post: h.post, put: h.put }, default: { get: h.get, post: h.post, put: h.put }, rawApiFetch: vi.fn() }));

import { builtinBody } from "@/pages/dashboard/DashboardHome";
import { normalizeAnalyticsResponse } from "@/pages/dashboard/DashboardAnalytics";
import FraudTab from "@/fraud/FraudTab";
import type { FraudOverview } from "@/fraud/fraudApi";
import CampaignReportPanel from "@/components/marketing/CampaignReportPanel";

beforeEach(() => { h.get.mockReset(); h.post.mockReset(); h.put.mockReset(); });

const metrics: any = { activeApplications: 5, dealsWonThisMonth: 0, commissionEarned: 0, newLeadsToday: 1, pipelineByStage: { "Off to Lender": 4, "Documents Required": 1 } };

describe("Dashboard (v884)", () => {
  it("shows the server's definitions under the cards, and nothing when they are absent", () => {
    const analytics = normalizeAnalyticsResponse({ data: { applicationFunnel: { "Documents Required": 1, Hold: 1, "Off to Lender": 2 }, applicationFunnelDefinition: "Applications created in the last 30 days." } });
    const withDefs = { ...metrics, definitions: { activeApplications: "Open applications on the board.", pipelineByStage: "Every application on the board today." } };
    const { unmount } = render(<>{builtinBody("dash_kpis", { metrics: withDefs, analytics, range: 30 })}{builtinBody("dash_pipeline", { metrics: withDefs, analytics, range: 30 })}{builtinBody("dash_dropoffs", { metrics: withDefs, analytics, range: 30 })}</>);
    expect(screen.getByTestId("def-active")).toHaveTextContent("Open applications on the board.");
    expect(screen.getByTestId("def-pipeline")).toHaveTextContent("Every application on the board today.");
    expect(screen.getByTestId("def-funnel")).toHaveTextContent("Applications created in the last 30 days.");
    // Bars are each stage's share of the funnel: 1, 1 and 2 of 4.
    expect(screen.getAllByTestId("funnel-bar").map((b) => (b as HTMLElement).style.width)).toEqual(["25%", "25%", "50%"]);
    unmount();
    const plain = normalizeAnalyticsResponse({ data: { applicationFunnel: { Hold: 1 } } });
    render(<>{builtinBody("dash_kpis", { metrics, analytics: plain, range: 30 })}{builtinBody("dash_dropoffs", { metrics, analytics: plain, range: 30 })}</>);
    expect(screen.queryByTestId("def-active")).toBeNull();
    expect(screen.queryByTestId("def-funnel")).toBeNull();
  });
});

const overview = (over: Partial<FraudOverview> = {}): FraudOverview => ({
  application_id: "app-1", checks: [], documents: [], include_prescreen_in_package: false,
  score: { score: 0, band: "low", reasons: [], covered: [{ check: "fraud_4", label: "Phone", status: "green" }], not_covered: [{ check: "fraud_6", label: "Registry", status: "not_configured", why: "not set up" }] },
  queue: { queued: true, done_at: null, last_error: null },
  ...over,
});

describe("Fraud check (v884)", () => {
  const routes = (o: FraudOverview) => h.get.mockImplementation(async (url: string) => (url.endsWith("/network") ? { ok: true, network: { nodes: [], edges: [] } } : { ok: true, ...o }));

  it("says how many checks the score rests on and shows the queue message instead of 'Checks are running'", async () => {
    routes(overview({
      score: { ...overview().score!, checks_run: 6, checks_total: 14, summary: "0 / 100 (low risk), based on 6 of 14 checks" },
      queue: { queued: true, done_at: null, last_error: null, message: "A new run is queued. The results below are from the last run that finished, and will update when it does.", results_from: "2026-11-02T20:00:00Z" },
    }));
    render(<FraudTab applicationId="app-1" />);
    expect(await screen.findByTestId("fraud-score-basis")).toHaveTextContent("Based on 6 of 14 checks; 8 could not run yet");
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("A new run is queued.");
    expect(status).not.toHaveTextContent("Checks are running");
  });

  it("still reads sensibly before the server update", async () => {
    routes(overview());
    render(<FraudTab applicationId="app-1" />);
    expect(await screen.findByTestId("fraud-score-basis")).toHaveTextContent("Based on 1 of 2 check(s).");
  });
});

describe("Campaign report (v884)", () => {
  it("explains a '-' when a campaign was sent before tracking", async () => {
    h.get.mockResolvedValue({ ok: true, days: 90, attribution_days: 30, funded_included: true, totals: { sent: 10, applications: 0, funded: 0, funded_amount: 0 },
      tracking_note: "1 email campaign(s) were sent before open, click and unsubscribe tracking per campaign started.",
      campaigns: [{ id: "e1", channel: "email", name: "Spring", status: "done", sent_at: "2026-10-01T00:00:00Z", sent: 10, tracked: false, opened: null, clicked: null, unsubscribed: null, open_rate: null, click_rate: null }] });
    render(<CampaignReportPanel />);
    expect(await screen.findByTestId("campaign-tracking-note")).toHaveTextContent("were sent before open, click and unsubscribe tracking");
    expect(screen.getByTestId("campaign-e1-untracked")).toBeInTheDocument();
  });
});
