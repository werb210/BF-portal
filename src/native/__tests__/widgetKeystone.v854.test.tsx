// BF_PORTAL_v854_KS_WIDGETS - Keystone on the staff widget: the KS snapshot the widget reads, the empty state for
// staff without Keystone, Keystone deep links, and "Follow the portal" on the Keystone pages.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const h = vi.hoisted(() => ({
  api: vi.fn(),
  setItem: vi.fn<(item: { group: string; key: string; value: string }) => Promise<void>>(async () => {}),
  reloadAllTimelines: vi.fn(async () => {}),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => true, getPlatform: () => "ios" },
  registerPlugin: () => ({ setItem: h.setItem, reloadAllTimelines: h.reloadAllTimelines }),
}));
vi.mock("@/api", () => ({ api: (...args: unknown[]) => h.api(...args) }));

import { keystoneSnapshot, publishKeystoneSnapshot, publishWidgetSnapshot, KS_WIDGET_KEY } from "../widgetSnapshot";
import { widgetRoute } from "../WidgetSnapshotProvider";

const KS_SUMMARY = {
  kind: "keystone",
  silo: "KS",
  available: true,
  reason: null,
  pipelineCount: 9,
  tasksDueToday: 5,
  tasksOverdue: 3,
  unreadMessages: 6,
  payingLicensees: 4,
  demosNeedFollowUp: 2,
  openSupportTickets: null,
  commissionEarned: 0,
  currency: "CAD",
  nextTask: { id: "t-1", title: "Call Ada", type: "CALL", dueAt: "2026-10-24T15:00:00.000Z", contactName: "Ada" },
  nextMeeting: { id: "b-1", title: "Keystone demo", start: "2026-10-25T16:00:00.000Z" },
  asOf: "2026-10-24T14:00:00.000Z",
};

const ksWrite = () => {
  const call = h.setItem.mock.calls.find(([item]) => item.key === KS_WIDGET_KEY);
  return call ? JSON.parse(call[0].value) : undefined;
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("the Keystone snapshot", () => {
  it("stores the server's Keystone figures in the shape the widget reads", async () => {
    h.api.mockResolvedValue(KS_SUMMARY);
    await publishKeystoneSnapshot();
    expect(h.api).toHaveBeenCalledWith("/api/widget/summary", { headers: { "X-Silo": "KS" } });
    expect(h.setItem).toHaveBeenCalledWith(expect.objectContaining({ group: "group.com.borealfinancial.portal", key: "widget_summary_KS" }));
    expect(ksWrite()).toEqual({
      schemaVersion: 2,
      silo: "KS",
      available: true,
      unavailableReason: null,
      pipelineCount: 9,
      tasksDueToday: 5,
      tasksOverdue: 3,
      unreadMessages: 6,
      commissionEarned: 0,
      payingLicensees: 4,
      demosNeedFollowUp: 2,
      openSupportTickets: null,
      currency: "CAD",
      documentsRequired: 0,
      additionalStepsRequired: 0,
      offersOutstanding: 0,
      nextTask: { id: "t-1", title: "Call Ada", type: "CALL", dueAt: "2026-10-24T15:00:00.000Z", contactName: "Ada" },
      nextMeeting: { id: "b-1", title: "Keystone demo", start: "2026-10-25T16:00:00.000Z" },
      asOf: "2026-10-24T14:00:00.000Z",
    });
  });

  it("keeps the support ticket count once the server sends one", () => {
    expect(keystoneSnapshot({ ...KS_SUMMARY, openSupportTickets: 7 })?.openSupportTickets).toBe(7);
  });

  it("stores the reason, and no numbers, for staff without Keystone", async () => {
    h.api.mockResolvedValue({ ...KS_SUMMARY, available: false, reason: "Keystone isn't turned on for your account.", pipelineCount: 3 });
    await publishKeystoneSnapshot();
    expect(ksWrite()).toMatchObject({
      available: false,
      unavailableReason: "Keystone isn't turned on for your account.",
      pipelineCount: 0,
      payingLicensees: 0,
      nextTask: null,
      nextMeeting: null,
    });
  });

  it("never stores another silo's numbers as Keystone (a server from before Keystone widgets)", async () => {
    h.api.mockResolvedValue({ silo: "BF", pipelineCount: 12, tasksDueToday: 1, unreadMessages: 2, commissionEarned: 5000 });
    await expect(publishKeystoneSnapshot()).rejects.toThrow("not_a_keystone_summary");
    expect(h.setItem).not.toHaveBeenCalled();
    expect(keystoneSnapshot({ ...KS_SUMMARY, silo: "BF" })).toBeNull();
    expect(keystoneSnapshot(null)).toBeNull();
  });

  it("is published with the other silos, and a Keystone failure does not stop them", async () => {
    h.api.mockImplementation((path: string, options?: { headers?: Record<string, string> }) => {
      const silo = options?.headers?.["X-Silo"];
      if (path === "/api/widget/summary" && silo === "KS") return Promise.resolve(KS_SUMMARY);
      if (path === "/api/widget/summary") return Promise.resolve({ silo, pipelineCount: 1, tasksDueToday: 0, unreadMessages: 0, commissionEarned: 0, currency: "CAD", asOf: "2026-10-24T14:00:00.000Z" });
      return Promise.resolve([]);
    });
    expect(await publishWidgetSnapshot()).toBe(true);
    const keys = h.setItem.mock.calls.map(([item]) => item.key).sort();
    expect(keys).toEqual(["widget_summary_BF", "widget_summary_BI", "widget_summary_KS", "widget_summary_SLF"]);

    vi.clearAllMocks();
    h.api.mockImplementation((path: string, options?: { headers?: Record<string, string> }) =>
      options?.headers?.["X-Silo"] === "KS" ? Promise.reject(new Error("offline")) : Promise.resolve(path === "/api/widget/summary" ? { silo: options?.headers?.["X-Silo"] } : []));
    expect(await publishWidgetSnapshot()).toBe(true);
    expect(h.setItem.mock.calls.map(([item]) => item.key)).not.toContain("widget_summary_KS");
  });
});

describe("Keystone deep links open the Keystone pages", () => {
  it.each([
    ["bfportal://pipeline?silo=KS", "/silo/ks/crm/pipeline"],
    ["bfportal://commission?silo=KS", "/silo/ks/crm/pipeline"],
    ["bfportal://dashboard?silo=KS", "/silo/ks/crm/pipeline"],
    ["bfportal://tasks?silo=KS&view=overdue", "/silo/ks/crm/tasks?view=overdue"],
    ["bfportal://tasks?silo=KS&view=nonsense", "/silo/ks/crm/tasks"],
    ["bfportal://crm?silo=KS", "/silo/ks/crm/contacts"],
    ["bfportal://messages?silo=ks&filter=unread", "/silo/ks/crm/contacts"],
    ["bfportal://support?silo=KS", "/silo/ks/tickets"],
    ["bfportal://calendar?silo=KS", "/calendar"],
  ])("routes %s", (url, path) => expect(widgetRoute(url)).toEqual({ path }));

  it("leaves the BF / BI / SLF links as they were", () => {
    expect(widgetRoute("bfportal://pipeline?silo=BI")).toEqual({ silo: "BI", path: "/pipeline" });
    expect(widgetRoute("bfportal://tasks?silo=BF&view=overdue")).toEqual({ silo: "BF", path: "/tasks?view=overdue" });
  });
});

describe('"Follow the portal" follows Keystone', () => {
  it("tells the widget KS on a Keystone page and the upper-case silo elsewhere", async () => {
    vi.resetModules();
    const mirror = vi.fn(async () => {});
    vi.doMock("@capacitor/app", () => ({ App: { addListener: vi.fn(() => Promise.resolve({ remove: vi.fn() })) } }));
    vi.doMock("@/native/widgetSnapshot", () => ({ publishWidgetSnapshot: vi.fn(async () => true) }));
    vi.doMock("@/native/widgetBridge", () => ({
      mirrorSiloToWidget: mirror,
      WidgetBridgePlugin: { removeItem: vi.fn(async () => {}) },
      WIDGET_GROUP: "group.com.borealfinancial.portal",
      isNativeIOS: () => true,
      syncWidgetSession: vi.fn(async () => {}),
    }));
    vi.doMock("@/context/SiloContext", () => ({ useSilo: () => ({ silo: "bi", setSilo: vi.fn() }) }));
    vi.doMock("@/lib/authToken", () => ({ getAuthToken: () => null }));
    vi.doMock("@/config/api", () => ({ __apiBaseUrls: { bf: "https://server.example" } }));
    const { default: Provider } = await import("../WidgetSnapshotProvider");

    const ks = render(<MemoryRouter initialEntries={["/silo/ks/crm/pipeline"]}><Provider /></MemoryRouter>);
    await waitFor(() => expect(mirror).toHaveBeenCalledWith("KS"));
    ks.unmount();

    mirror.mockClear();
    render(<MemoryRouter initialEntries={["/pipeline"]}><Provider /></MemoryRouter>);
    await waitFor(() => expect(mirror).toHaveBeenCalledWith("BI"));
    expect(mirror).not.toHaveBeenCalledWith("bi");
  });
});
