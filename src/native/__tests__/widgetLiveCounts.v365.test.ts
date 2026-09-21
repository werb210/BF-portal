// BF_PORTAL_WIDGET_LIVE_COUNTS_v365
import { describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => true, getPlatform: () => "ios" },
  registerPlugin: () => ({ setItem: vi.fn(async () => {}), reloadAllTimelines: vi.fn(async () => {}) }),
}));
vi.mock("@/api", () => ({ api: (...args: unknown[]) => h.api(...args) }));

import { livePipelineCount } from "../widgetSnapshot";

describe("widget pipeline counts match each silo's own screen", () => {
  it("Financial counts the board: named applications, junk drafts left out", async () => {
    h.api.mockResolvedValueOnce({ items: [
      { name: "Voss Events", created_at: "2026-09-19T00:00:00Z" },
      { name: "Equipment leg - cafe", created_at: "2026-09-17T00:00:00Z" },
      { name: "", created_at: "2026-09-19T00:00:00Z" },
    ] });
    expect(await livePipelineCount("BF")).toBe(2);
    expect(h.api).toHaveBeenLastCalledWith("/api/portal/applications", { headers: { "X-Silo": "BF" } });
  });
  it("Insurance counts the BI Dashboard's visible stages, not pre-pipeline drafts", async () => {
    h.api.mockResolvedValueOnce([{ stage: "submitted" }, { stage: "in_progress" }, { stage: "draft" }]);
    expect(await livePipelineCount("BI")).toBe(1);
  });
  it("SLF counts every synced deal", async () => {
    h.api.mockResolvedValueOnce([{ amount: 70350 }, { amount: 500000 }]);
    expect(await livePipelineCount("SLF")).toBe(2);
  });
  it("falls back (null) when a count cannot be read", async () => {
    h.api.mockRejectedValueOnce(new Error("offline"));
    expect(await livePipelineCount("SLF")).toBeNull();
  });
});
