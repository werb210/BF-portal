// BF_PORTAL_v811_MOBILE_APPS - Marketing > Mobile apps (BF silo): app usage by device, app vs web, sign-in methods,
// versions, notifications and quick sign-in; store downloads marked not connected.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

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
import MobileAppsPanel from "../MobileAppsPanel";
import SiloContext from "@/context/SiloContext";

const REPORT = {
  days: 30,
  devices: ["iphone", "ipad", "android", "android_tablet", "web"],
  active: { iphone: { d1: 2, d7: 4, period: 6 }, ipad: { d1: 0, d7: 1, period: 1 }, android: { d1: 1, d7: 2, period: 3 }, android_tablet: { d1: 0, d7: 0, period: 0 }, web: { d1: 5, d7: 9, period: 20 } },
  events: {
    iphone: { open: { count: 30, users: 6 }, sign_in: { count: 8, users: 5 }, application_started: { count: 2, users: 2 }, application_submitted: { count: 1, users: 1 }, document_uploaded: { count: 9, users: 3 }, form_submitted: { count: 4, users: 2 } },
    ipad: { open: { count: 2, users: 1 }, sign_in: { count: 1, users: 1 }, application_started: { count: 0, users: 0 }, application_submitted: { count: 0, users: 0 }, document_uploaded: { count: 0, users: 0 }, form_submitted: { count: 0, users: 0 } },
    android: { open: { count: 7, users: 3 }, sign_in: { count: 3, users: 2 }, application_started: { count: 1, users: 1 }, application_submitted: { count: 1, users: 1 }, document_uploaded: { count: 2, users: 1 }, form_submitted: { count: 0, users: 0 } },
    android_tablet: { open: { count: 0, users: 0 }, sign_in: { count: 0, users: 0 }, application_started: { count: 0, users: 0 }, application_submitted: { count: 0, users: 0 }, document_uploaded: { count: 0, users: 0 }, form_submitted: { count: 0, users: 0 } },
    web: { open: { count: 50, users: 20 }, sign_in: { count: 15, users: 12 }, application_started: { count: 6, users: 6 }, application_submitted: { count: 3, users: 3 }, document_uploaded: { count: 11, users: 4 }, form_submitted: { count: 5, users: 3 } },
  },
  daily: [{ day: new Date().toISOString().slice(0, 10), device: "iphone", users: 2 }],
  signInMethods: [{ method: "biometric", device: "iphone", count: 4 }],
  versions: [{ device: "iphone", version: "1.0 (1)", users: 6, lastSeen: "2026-10-15" }],
  notificationsOn: [{ platform: "ios", users: 4 }, { platform: "android", users: 1 }],
  quickSignIn: { biometric: 3, passkey: 1 },
  stores: { apple: { connected: false, note: "Connects once Apple approves." }, google: { connected: false, note: "Connects once live." } },
};

beforeEach(() => {
  for (const k of ["get", "post", "put", "patch", "delete"]) h.apiFn[k].mockReset().mockResolvedValue({});
  h.apiFn.mockReset().mockResolvedValue({});
  h.apiFn.get.mockImplementation(async (url: string) => (url.startsWith("/api/reports/mobile-apps") ? REPORT : {}));
  window.history.replaceState(null, "", "/marketing");
});

const inSilo = (silo: string, node: React.ReactNode) => render(<SiloContext.Provider value={{ silo, setSilo: () => undefined } as any}>{node}</SiloContext.Provider>);

describe("v811 Marketing > Mobile apps", () => {
  it("is a Marketing tab in the BF silo", async () => {
    inSilo("bf", <MarketingDashboard />);
    fireEvent.click(screen.getByRole("button", { name: "Mobile apps" }));
    expect(await screen.findByTestId("mobile-apps-panel")).toBeTruthy();
    await waitFor(() => expect(h.apiFn.get).toHaveBeenCalledWith("/api/reports/mobile-apps?days=30"));
  });

  it("is not offered in another silo", () => {
    inSilo("bi", <MarketingDashboard />);
    expect(screen.queryByRole("button", { name: "Mobile apps" })).toBeNull();
  });

  it("opens straight to the tab from ?tab=apps", async () => {
    window.history.replaceState(null, "", "/marketing?tab=apps");
    inSilo("bf", <MarketingDashboard />);
    expect(await screen.findByTestId("mobile-apps-panel")).toBeTruthy();
  });

  it("shows active users, app vs web, devices, sign-in methods, versions and the store status", async () => {
    render(<MobileAppsPanel />);
    expect(within(await screen.findByTestId("apps-active-period")).getByText("10")).toBeTruthy(); // 6 + 1 + 3 + 0 app users
    expect(within(screen.getByTestId("apps-active-period")).getByText("20 on the web")).toBeTruthy();
    expect(within(screen.getByTestId("apps-notifications")).getByText("5")).toBeTruthy();
    expect(within(screen.getByTestId("apps-quick-signin")).getByText("4")).toBeTruthy();
    const vs = screen.getByTestId("apps-vs-web");
    const submitted = within(vs).getByText("Applications submitted").closest("tr")!;
    expect(submitted.textContent).toBe("Applications submitted23");
    expect(within(screen.getByTestId("apps-device-table")).getByText("iPhone").closest("tr")!.textContent).toBe("iPhone63082194");
    expect(within(screen.getByTestId("apps-signin-methods")).getByText("Face ID / fingerprint")).toBeTruthy();
    expect(within(screen.getByTestId("apps-versions")).getByText("1.0 (1)")).toBeTruthy();
    expect(screen.getByTestId("apps-stores").textContent).toContain("Not connected yet. Connects once Apple approves.");
    expect(screen.getByTestId("apps-daily-chart").querySelectorAll("rect[rx]").length).toBe(1);
  });

  it("changes the period", async () => {
    render(<MobileAppsPanel />);
    await screen.findByTestId("apps-active-period");
    fireEvent.click(screen.getByRole("button", { name: "90 days" }));
    await waitFor(() => expect(h.apiFn.get).toHaveBeenCalledWith("/api/reports/mobile-apps?days=90"));
  });
});
