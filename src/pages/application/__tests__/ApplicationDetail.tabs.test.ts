// BF_NO_OVERVIEW_v41 — Block 41-C — Overview must never reappear.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

describe("ApplicationDetail tabs", () => {
  const src = readFileSync(join(process.cwd(), "src/pages/application/ApplicationDetail.tsx"), "utf-8");
  // BF_PORTAL_v938_CARD_REDESIGN - Todd and Andrew brought Overview back (Nov 11 2026) as the group holding the
  // Application, Financials and Banking analysis sub-tabs; the old Overview tab (OverviewTab) must still never return.
  it("Overview is the group of Application, Financials and Banking analysis", () => {
    expect(src).toMatch(/key: "overview", label: "Overview", subs: \[/);
  });
  it("does not import OverviewTab", () => {
    expect(src).not.toMatch(/OverviewTab/);
  });
  it("falls back to 'application' tab when path has no match", () => {
    expect(src).toMatch(/\?\?\s*"application"/);
  });
});
