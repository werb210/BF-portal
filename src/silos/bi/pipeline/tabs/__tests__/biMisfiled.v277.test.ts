// BF_PORTAL_BI_MISFILED_v277
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { biMisfiledText } from "../DocumentsTab";

describe("BI misfiled document badge", () => {
  it("names what the document looks like", () => {
    expect(biMisfiledText({ looks_misfiled: true, detected_label: "a personal guarantee", detected_confidence: 0.7 })).toBe("Looks like a personal guarantee (70%)");
  });
  it("shows nothing unless BI-Server flags it", () => {
    expect(biMisfiledText({ looks_misfiled: false, detected_label: "a loan agreement", detected_confidence: 0.9 })).toBeNull();
    expect(biMisfiledText({})).toBeNull();
  });
  it("is rendered on each document row", () => {
    const tab = fs.readFileSync(path.resolve(__dirname, "../DocumentsTab.tsx"), "utf8");
    expect(tab).toContain('data-testid="bi-misfiled-badge"');
  });
});
