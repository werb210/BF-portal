// BF_PORTAL_v913_CHATGPT_ADS
import { describe, expect, it } from "vitest";
import { costPer, presetRange } from "../ChatgptAdsPanel";

describe("ChatGPT Ads panel helpers", () => {
  it("builds a preset range ending today", () => {
    expect(presetRange(30, new Date("2026-11-09T12:00:00Z"))).toEqual({ since: "2026-10-11", until: "2026-11-09" });
    expect(presetRange(7, new Date("2026-11-09T12:00:00Z"))).toEqual({ since: "2026-11-03", until: "2026-11-09" });
  });
  it("cost per conversion is blank with no conversions", () => {
    expect(costPer(100, 0)).toBeNull();
    expect(costPer(100, 4)).toBe(25);
  });
});
