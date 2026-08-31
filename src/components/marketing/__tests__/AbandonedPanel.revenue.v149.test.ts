// BF_PORTAL_ABANDONED_REVENUE_v149
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const panel = readFileSync(resolve(__dirname, "..", "AbandonedPanel.tsx"), "utf-8");

describe("the revenue answer is shown", () => {
  it("has a column", () => {
    expect(panel).toContain("<th style={{ padding: \"6px 8px\" }}>Monthly revenue</th>");
  });

  it("renders the value, or a dash when they never answered", () => {
    expect(panel).toContain('{i.monthlyRevenue || "-"}');
  });

  it("carries the fields the server now returns", () => {
    expect(panel).toContain("monthlyRevenue?: string | null;");
    expect(panel).toContain("belowCanadianFloor?: boolean;");
  });
});

describe("an unfundable row is marked, not hidden", () => {
  it("shows a badge rather than removing the row", () => {
    expect(panel).toContain('data-testid="abandoned-below-floor"');
    expect(panel).toContain("no lender");
    // Staff still see them - a hidden row is a row nobody can sanity-check.
    expect(panel).not.toContain("filter((i) => !i.belowCanadianFloor).map");
  });

  it("explains why on hover", () => {
    expect(panel).toContain("Below the Canadian panel minimum of $10,000");
  });
});

describe("the header says how many are worth calling", () => {
  it("splits callable from below-floor", () => {
    expect(panel).toContain('data-testid="abandoned-callable"');
    expect(panel).toContain("callable");
    expect(panel).toContain("below the CA floor");
  });

  it("only appears when there is something to split", () => {
    expect(panel).toContain("items.some((x) => x.belowCanadianFloor)");
  });
});
