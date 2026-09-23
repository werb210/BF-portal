// BF_PORTAL_NEGATIVES_AUTO_MATCH_v433
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { chooseMatch, batchByMatch } from "../autoMatch";

// The real list from production, 7-day window.
const LIST = [
  "sba loan", "sba 7a loan", "sba 7a loan requirements", "sba loan rates",
  "canada business loan", "sb7a loan", "federal small business loans",
  "commercial lending terms", "sba 7a", "commercial building loan rates",
  "llc loans", "international project funding no upfront fees", "sba loan requirements",
];

describe("v433 the panel picks the match type", () => {
  it("never sends a single word as PHRASE - Google rejects it", () => {
    expect(chooseMatch("loans", LIST).matchType).toBe("EXACT");
    expect(chooseMatch("sba", LIST).matchType).toBe("EXACT");
  });

  it("uses PHRASE for a term other listed searches contain", () => {
    const decision = chooseMatch("sba loan", LIST);
    expect(decision.matchType).toBe("PHRASE");
    expect(decision.alsoBlocks).toContain("sba loan rates");
    expect(decision.alsoBlocks).toContain("sba loan requirements");
  });

  it("uses EXACT for a one-off nobody else matches", () => {
    const decision = chooseMatch("international project funding no upfront fees", LIST);
    expect(decision.matchType).toBe("EXACT");
    expect(decision.alsoBlocks).toEqual([]);
  });

  it("drops to EXACT rather than block a search that converted", () => {
    const decision = chooseMatch("sba loan", LIST, ["sba loan rates"]);
    expect(decision.matchType).toBe("EXACT");
    expect(decision.reason).toContain("converted");
  });

  it("explains itself without saying Phrase or Exact", () => {
    for (const term of ["sba loan", "llc loans", "commercial lending terms"]) {
      const reason = chooseMatch(term, LIST).reason;
      expect(reason.toLowerCase()).not.toContain("phrase");
      expect(reason.toLowerCase()).not.toContain("exact search type");
      expect(reason.length).toBeGreaterThan(10);
    }
  });

  it("groups a mixed selection into one request per match type", () => {
    const batches = batchByMatch(["sba loan", "llc loans", "commercial lending terms"], LIST);
    const phrase = batches.find((b) => b.matchType === "PHRASE");
    const exact = batches.find((b) => b.matchType === "EXACT");
    expect(phrase?.terms).toContain("sba loan");
    expect(exact?.terms).toContain("llc loans");
  });

  it("handles an empty or blank term without throwing", () => {
    expect(chooseMatch("", LIST).matchType).toBe("EXACT");
    expect(batchByMatch([], LIST)).toEqual([]);
  });

  it("the global Match dropdown is gone", () => {
    const panel = readFileSync(
      path.join(process.cwd(), "src/pages/diagnostics/NegativesPanel.tsx"), "utf8");
    expect(panel).not.toContain('<option value="PHRASE">Phrase</option>');
    expect(panel).toContain("batchByMatch(");
  });
});
