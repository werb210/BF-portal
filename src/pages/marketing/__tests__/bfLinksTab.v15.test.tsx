// BF_PORTAL_BF_LINKS_TAB_v15
// BF_PORTAL_v789_SOURCE_GREP - rewritten as a behaviour test.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const h = vi.hoisted(() => {
  const apiFn = vi.fn() as any;
  apiFn.get = vi.fn();
  apiFn.post = vi.fn();
  apiFn.put = vi.fn();
  apiFn.patch = vi.fn();
  apiFn.delete = vi.fn();
  return { apiFn };
});
vi.mock("@/api", () => ({ api: h.apiFn, default: h.apiFn, apiGetEnvelope: vi.fn(), rawApiFetch: vi.fn() }));

vi.mock("@/components/marketing/LinkClicksPanel", () => ({
  default: ({ apiBase }: { apiBase?: string }) => <div data-testid="link-clicks-panel">{apiBase ?? "bf"}</div>,
}));
// Everything else the two marketing pages mount is stubbed: this file is about where the link report lives.
vi.mock("@/components/marketing/BrandedEmailComposer", () => ({ default: () => <div>email composer</div> }));
vi.mock("@/components/marketing/SequenceCanvas", () => ({ default: () => <div>sequence canvas</div> }));
vi.mock("@/components/marketing/AbandonedPanel", () => ({ default: () => null }));
vi.mock("@/pages/marketing/ReferrersAndBrokers", () => ({ default: () => null }));
vi.mock("@/pages/diagnostics/DiagnosticsPage", () => ({ default: () => null }));
vi.mock("@/pages/diagnostics/NegativesPanel", () => ({ default: () => null }));
vi.mock("@/pages/diagnostics/ClicksPanel", () => ({ default: () => null }));
vi.mock("@/components/marketing/AdsConversionStatus", () => ({ default: () => null }));
vi.mock("@/pages/admin/AutomationsPage", () => ({ default: () => null }));
vi.mock("@/components/marketing/GoogleAdsAnalytics", () => ({
  AdsStoryPanel: () => null, VisitorsPanel: () => null, DropoffPanel: () => null, AudiencesNote: () => null,
}));
vi.mock("@/components/marketing/CustomerMatchPanel", () => ({ default: () => null }));
vi.mock("@/pages/settings/tabs/GoogleHealthPanel", () => ({ default: () => null }));
vi.mock("@/silos/bi/marketing/tabs/SequencesTab", () => ({ default: () => null }));

import MarketingDashboard from "../MarketingDashboard";
import BIMarketing from "@/silos/bi/marketing/BIMarketing";

beforeEach(() => {
  h.apiFn.get.mockReset();
  h.apiFn.get.mockResolvedValue({});
  h.apiFn.post.mockReset();
  h.apiFn.post.mockResolvedValue({});
  h.apiFn.mockReset();
  h.apiFn.mockResolvedValue({});
});

describe("link report parity across silos", () => {
  it("BF has a Links tab that shows the link report", () => {
    render(<MarketingDashboard />);
    expect(screen.queryByTestId("link-clicks-panel")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Links" }));
    expect(screen.getByTestId("link-clicks-panel")).toHaveTextContent("bf");
  });

  it("BI still has its Links tab", () => {
    render(<BIMarketing />);
    fireEvent.click(screen.getByRole("tab", { name: "Links" }));
    expect(screen.getByTestId("link-clicks-panel")).toHaveTextContent("/api/v1/bi/marketing");
  });

  it("the panel is no longer duplicated inside the BF Analytics tab", () => {
    render(<MarketingDashboard />);
    fireEvent.click(screen.getByRole("button", { name: "Analytics" }));
    expect(screen.queryAllByTestId("link-clicks-panel")).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Links" }));
    expect(screen.getAllByTestId("link-clicks-panel")).toHaveLength(1);
  });
});
