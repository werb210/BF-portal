// BF_PORTAL_v819_MOBILE_REPORT - the Marketing > Mobile apps report is a Dashboard library card (Admin / Marketing),
// draws the five tiles and the by-device table for the Dashboard period, and the library has no duplicate entries.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const h = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), role: "Admin" as string }));
vi.mock("@/api", () => ({ api: { get: (...a: unknown[]) => h.get(...a), put: (...a: unknown[]) => h.put(...a) } }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ isAuthenticated: true, isLoading: false, role: h.role }) }));
vi.mock("@/pages/reports/ReportsBoard", () => ({ CardBody: ({ report }: { report: string }) => <div>body-{report}</div> }));
vi.mock("../TeamMessagesCard", () => ({ default: () => <div>team</div> }));

import DashboardHome from "../DashboardHome";
import { MOBILE_APPS_KEY, MOBILE_APPS_REPORT, canSeeReportGroup, dedupeReports, withPortalReports } from "@/pages/reports/reportLibrary";

const REPORT = {
  days: 30,
  devices: ["iphone", "android", "web"],
  active: { iphone: { d1: 2, d7: 4, period: 6 }, android: { d1: 1, d7: 2, period: 3 }, web: { d1: 5, d7: 9, period: 20 } },
  events: { iphone: { open: { count: 30, users: 6 }, sign_in: { count: 8, users: 5 } }, android: {}, web: { open: { count: 50, users: 20 } } },
  daily: [], signInMethods: [], versions: [],
  notificationsOn: [{ platform: "ios", users: 4 }, { platform: "android", users: 1 }],
  quickSignIn: { biometric: 3, passkey: 1 },
  stores: { apple: { connected: false, note: "" }, google: { connected: false, note: "" } },
};
const SERVER_CATALOG = [
  { key: "ads_story", title: "Ads: the story", silo: "BF", group: "marketing", size: "full", description: "a" },
  { key: "ads_dropoff", title: "Where applications stop", silo: "BF", group: "marketing", size: "full", description: "b" },
  { key: "ads_story", title: "Ads: the story", silo: "BF", group: "marketing", size: "full", description: "a" },
  { key: "ads_dropoff", title: "Where applications stop", silo: "BF", group: "marketing", size: "half", description: "b" },
];
let saved: unknown = null;

beforeEach(() => {
  h.role = "Admin"; saved = null;
  h.get.mockReset(); h.put.mockReset();
  h.put.mockImplementation(async (_url: string, body: { dashboard?: unknown }) => { saved = body.dashboard; return { ok: true }; });
  vi.spyOn(window, "confirm").mockReturnValue(true);
  h.get.mockImplementation(async (url: string) => {
    if (url.startsWith("/api/dashboard/metrics")) return { activeApplications: 1, dealsWonThisMonth: 0, commissionEarned: 0, newLeadsToday: 0, pipelineByStage: {} };
    if (url.startsWith("/api/dashboard/analytics")) return {};
    if (url.startsWith("/api/reports/catalog")) return { reports: SERVER_CATALOG };
    if (url.startsWith("/api/reports/mobile-apps")) return { ...REPORT, days: Number(url.split("days=")[1]) };
    if (url.startsWith("/api/reports/layouts")) return { tabs: [], dashboard: saved };
    return {};
  });
});

describe("v819 Mobile apps report in the Dashboard library", () => {
  it("is a marketing-type entry: Admin and Marketing see it, Staff does not", () => {
    expect(MOBILE_APPS_REPORT).toMatchObject({ key: "mobile_apps", title: "Mobile apps", silo: "BF", group: "marketing" });
    expect(MOBILE_APPS_REPORT.description).toMatch(/active users, app vs web, devices, notifications and quick sign-in/);
    expect(canSeeReportGroup("Admin", "marketing")).toBe(true);
    expect(canSeeReportGroup("marketing", "marketing")).toBe(true);
    expect(canSeeReportGroup("Staff", "marketing")).toBe(false);
    expect(withPortalReports([], "Admin").map((r) => r.key)).toContain(MOBILE_APPS_KEY);
    expect(withPortalReports([], "Marketing").map((r) => r.key)).toContain(MOBILE_APPS_KEY);
    expect(withPortalReports([], "Staff").map((r) => r.key)).not.toContain(MOBILE_APPS_KEY);
    expect(withPortalReports([], null).map((r) => r.key)).not.toContain(MOBILE_APPS_KEY);
  });

  it("removes duplicate catalog entries and does not add Mobile apps twice", () => {
    expect(dedupeReports(SERVER_CATALOG).map((r) => r.key)).toEqual(["ads_story", "ads_dropoff"]);
    const fromServer = withPortalReports([...SERVER_CATALOG, MOBILE_APPS_REPORT], "Admin");
    expect(fromServer.filter((r) => r.key === MOBILE_APPS_KEY)).toHaveLength(1);
    expect(fromServer).toHaveLength(3);
  });

  it("lists Mobile apps once and each report once in + Add report for an Admin", async () => {
    render(<MemoryRouter><DashboardHome /></MemoryRouter>);
    await screen.findByTestId("dash-card-dash_kpis");
    fireEvent.click(screen.getByTestId("dash-add"));
    const lib = screen.getByTestId("dash-library");
    expect(within(lib).getAllByText("Mobile apps")).toHaveLength(1);
    expect(within(lib).getByText(/Client app use: active users/)).toBeTruthy();
    expect(within(lib).getAllByText("Ads: the story")).toHaveLength(1);
    expect(within(lib).getAllByText("Where applications stop")).toHaveLength(1);
  });

  it("is not offered to Staff", async () => {
    h.role = "Staff";
    render(<MemoryRouter><DashboardHome /></MemoryRouter>);
    await screen.findByTestId("dash-card-dash_kpis");
    fireEvent.click(screen.getByTestId("dash-add"));
    expect(within(screen.getByTestId("dash-library")).queryByText("Mobile apps")).toBeNull();
  });

  it("adds the card, draws the tiles and device table, and follows the Dashboard period", async () => {
    render(<MemoryRouter><DashboardHome /></MemoryRouter>);
    await screen.findByTestId("dash-card-dash_kpis");
    fireEvent.click(screen.getByTestId("dash-add"));
    fireEvent.click(within(screen.getByTestId("dash-library")).getByText("Mobile apps"));
    const card = await screen.findByTestId("dash-card-mobile_apps");
    await waitFor(() => expect(h.get).toHaveBeenCalledWith("/api/reports/mobile-apps?days=30"));
    expect(await within(card).findByTestId("mobile-apps-summary")).toBeTruthy();
    expect(within(card).getByTestId("apps-active-today").textContent).toContain("3");
    expect(within(card).getByTestId("apps-active-today").textContent).toContain("5 on the web");
    expect(within(card).getByTestId("apps-notifications").textContent).toContain("5");
    expect(within(card).getByTestId("apps-quick-signin").textContent).toContain("4");
    expect(within(card).getByTestId("apps-active-period").textContent).toContain("Active last 30 days (app)");
    const table = within(card).getByTestId("apps-device-table");
    expect(table.textContent).toContain("iPhone");
    expect(table.textContent).toContain("Web browser");
    expect(within(card).queryByTestId("apps-versions")).toBeNull();
    const body = h.put.mock.calls.at(-1)![1] as { dashboard: { cards: Array<{ report: string }> } };
    expect(body.dashboard.cards.some((c) => c.report === "mobile_apps")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "90 days" }));
    await waitFor(() => expect(h.get).toHaveBeenCalledWith("/api/reports/mobile-apps?days=90"));
    expect(await within(card).findByText("Active last 90 days (app)")).toBeTruthy();
  });

  it("shows an error message in the card when the report cannot load", async () => {
    saved = { cards: [{ id: "dash_kpis", report: "dash_kpis", size: "full" }, { id: "m", report: "mobile_apps", size: "full" }] };
    h.get.mockImplementation(async (url: string) => {
      if (url.startsWith("/api/reports/mobile-apps")) throw new Error("down");
      if (url.startsWith("/api/reports/layouts")) return { tabs: [], dashboard: saved };
      if (url.startsWith("/api/reports/catalog")) return { reports: [] };
      return {};
    });
    render(<MemoryRouter><DashboardHome /></MemoryRouter>);
    const card = await screen.findByTestId("dash-card-mobile_apps");
    expect(await within(card).findByText("Could not load the mobile app report.")).toBeTruthy();
    expect(within(card).getByText("Mobile apps")).toBeTruthy();
  });
});
