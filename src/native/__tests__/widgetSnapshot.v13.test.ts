import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  native: true,
  platform: "ios",
  api: vi.fn(),
  setItem: vi.fn(async () => {}),
  reloadAllTimelines: vi.fn(async () => {}),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: () => h.native,
    getPlatform: () => h.platform,
  },
  registerPlugin: () => ({
    setItem: h.setItem,
    reloadAllTimelines: h.reloadAllTimelines,
  }),
}));
vi.mock("@/api", () => ({ api: (...args: unknown[]) => h.api(...args) }));

import { publishWidgetSnapshot } from "../widgetSnapshot";

const summaries = {
  BF: { silo: "BF", pipelineCount: 4, tasksDueToday: 2, unreadMessages: 3, commissionEarned: 44000, currency: "CAD", asOf: "2026-08-28T19:30:00.000Z" },
  BI: { silo: "BI", pipelineCount: 1, tasksDueToday: 0, unreadMessages: 2, commissionEarned: 1000, currency: "CAD", asOf: "2026-08-28T19:30:00.000Z" },
  SLF: { silo: "SLF", pipelineCount: 3, tasksDueToday: 1, unreadMessages: 0, commissionEarned: 2000, currency: "CAD", asOf: "2026-08-28T19:30:00.000Z" },
};

beforeEach(() => {
  vi.clearAllMocks();
  h.native = true;
  h.platform = "ios";
  h.api.mockImplementation((_path: string, options: { headers: { "X-Silo": keyof typeof summaries } }) =>
    Promise.resolve(summaries[options.headers["X-Silo"]]));
});

describe("widget snapshots", () => {
  it("uses the authenticated summary API and writes one snapshot for every silo", async () => {
    expect(await publishWidgetSnapshot()).toBe(true);
    for (const silo of ["BF", "BI", "SLF"] as const) {
      expect(h.api).toHaveBeenCalledWith("/api/widget/summary", { headers: { "X-Silo": silo } });
      expect(h.setItem).toHaveBeenCalledWith({
        group: "group.com.boreal.portal",
        key: `widget_summary_${silo}`,
        value: expect.stringContaining(`"silo":"${silo}"`),
      });
      const write = h.setItem.mock.calls.find(([item]) => item.key === `widget_summary_${silo}`)?.[0];
      const snapshot = JSON.parse(write.value);
      expect(snapshot).toMatchObject({
        schemaVersion: 2, silo, pipelineCount: summaries[silo].pipelineCount,
        tasksDueToday: summaries[silo].tasksDueToday, unreadMessages: summaries[silo].unreadMessages,
        commissionEarned: summaries[silo].commissionEarned, currency: "CAD",
        tasksOverdue: 0, documentsRequired: 0, additionalStepsRequired: 0, offersOutstanding: 0,
        nextTask: null, nextMeeting: null, asOf: summaries[silo].asOf,
      });
    }
    expect(h.reloadAllTimelines).toHaveBeenCalledOnce();
  });

  it("normalizes untrusted runtime summary values into the versioned persistence schema", async () => {
    h.api.mockImplementation((path: string) => {
      if (path === "/api/widget/summary") return Promise.resolve({
        silo: "untrusted", pipelineCount: "7", tasksDueToday: "bad", unreadMessages: Infinity,
        commissionEarned: "1250", currency: 99, asOf: null, injected: "must not persist",
      });
      return Promise.resolve([]);
    });

    expect(await publishWidgetSnapshot()).toBe(true);
    const snapshot = JSON.parse(h.setItem.mock.calls[0][0].value);
    expect(snapshot).toMatchObject({
      schemaVersion: 2, silo: "BF", pipelineCount: 7, tasksDueToday: 0,
      unreadMessages: 0, commissionEarned: 1250, currency: "CAD",
      nextTask: null, nextMeeting: null,
    });
    expect(snapshot.asOf).toEqual(expect.any(String));
    expect(snapshot).not.toHaveProperty("injected");
  });

  it("keeps successful snapshots when another silo is unavailable", async () => {
    h.api.mockImplementation((_path: string, options: { headers: { "X-Silo": keyof typeof summaries } }) =>
      options.headers["X-Silo"] === "BI" ? Promise.reject(new Error("forbidden")) : Promise.resolve(summaries[options.headers["X-Silo"]]));
    expect(await publishWidgetSnapshot()).toBe(true);
    expect(h.setItem).toHaveBeenCalledTimes(2);
    expect(h.setItem).toHaveBeenCalledWith(expect.objectContaining({ key: "widget_summary_BF" }));
    expect(h.setItem).toHaveBeenCalledWith(expect.objectContaining({ key: "widget_summary_SLF" }));
    expect(h.reloadAllTimelines).toHaveBeenCalledOnce();
  });

  it("does no API or App Group work in a browser", async () => {
    h.native = false;
    expect(await publishWidgetSnapshot()).toBe(false);
    expect(h.api).not.toHaveBeenCalled();
    expect(h.setItem).not.toHaveBeenCalled();
  });
});
