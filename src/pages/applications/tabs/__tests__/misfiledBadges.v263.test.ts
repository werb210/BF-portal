// BF_PORTAL_MISFILED_BADGES_v263
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { autoMovedText, misfiledBadgeText } from "../misfiledBadges";

describe("misfiled document badges", () => {
  it("names what the document looks like, with confidence", () => {
    expect(misfiledBadgeText({ looksMisfiled: true, detectedLabel: "tax returns", detectedConfidence: 0.82 })).toBe("Looks like tax returns (82%)");
  });
  it("shows nothing unless the server says it looks misfiled", () => {
    expect(misfiledBadgeText({ looksMisfiled: false, detectedLabel: "bank statements", detectedConfidence: 0.9 })).toBeNull();
    expect(misfiledBadgeText({})).toBeNull();
  });
  it("explains a genuine automatic move", () => {
    expect(autoMovedText({ autoMovedFrom: "3 years accountant prepared financials" })).toBe("Moved automatically from 3 years accountant prepared financials");
    expect(autoMovedText({ autoMovedFrom: null })).toBeNull();
  });
  it("is rendered on each document row", () => {
    const tab = fs.readFileSync(path.resolve(__dirname, "../DocumentsTab.tsx"), "utf8");
    expect(tab).toContain('data-testid="misfiled-badge"');
    expect(tab).toContain('data-testid="auto-moved-badge"');
    expect(tab).toContain("& MisfiledFields");
  });
});
