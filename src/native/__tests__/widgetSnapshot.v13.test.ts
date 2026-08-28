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
        value: JSON.stringify(summaries[silo]),
      });
    }
    expect(h.reloadAllTimelines).toHaveBeenCalledOnce();
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
