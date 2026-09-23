// BF_PORTAL_NEGATIVES_REASON_LINE_v434
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
const panel = readFileSync(
  path.join(process.cwd(), "src/pages/diagnostics/NegativesPanel.tsx"), "utf8");

describe("v434 a ticked row shows what it will block", () => {
  it("only computes a decision for rows that are ticked", () => {
    expect(panel).toContain("picked.has(row.searchTerm)\n              ? chooseMatch(");
  });

  it("passes the converting searches into the decision", () => {
    expect(panel).toContain('Number(candidate.conversions ?? 0) > 0');
  });

  it("lists the other searches the choice catches", () => {
    expect(panel).toContain("decision.alsoBlocks.length > 0");
    expect(panel).toContain("decision.alsoBlocks.join");
  });

  it("marks a decision that touches a converting search in red", () => {
    expect(panel).toContain('touchesAConverter ? "#b00020"');
  });

  it("renders the reason in its own addressable row", () => {
    expect(panel).toContain("negatives-reason-");
  });
});
