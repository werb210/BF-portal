// BF_PORTAL_BLOCK_v478_BUILD_STAMP_AND_UPDATE_PROMPT
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildStampLabel } from "../buildInfo";

describe("v478 build stamp", () => {
  it("shows the commit and Alberta build time", () => {
    const label = buildStampLabel("1a2b3c4", "2026-09-24T20:20:00Z");
    expect(label.startsWith("Build 1a2b3c4 - ")).toBe(true);
    expect(label).toMatch(/Sep\.? 24/);
    expect(label).toMatch(/2:20/);
  });
  it("falls back to the commit alone without a build time", () => {
    expect(buildStampLabel("dev", null)).toBe("Build dev");
    expect(buildStampLabel("abc1234", "not-a-date")).toBe("Build abc1234");
  });
  it("vite bakes the values in and the layout renders stamp + update prompt", () => {
    const vite = readFileSync(resolve(__dirname, "../../../vite.config.ts"), "utf8");
    const layout = readFileSync(resolve(__dirname, "../../layouts/AppLayout.tsx"), "utf8");
    expect(vite).toContain("__BUILD_SHA__: JSON.stringify(buildSha())");
    expect(vite).toContain("__BUILD_TIME__: JSON.stringify(new Date().toISOString())");
    expect(layout).toContain('data-testid="build-stamp"');
    expect(layout).toContain("<UpdatePromptBanner />");
  });
});
