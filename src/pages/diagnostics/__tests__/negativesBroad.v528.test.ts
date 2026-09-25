// BF_PORTAL_BLOCK_v528
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { batchByMatch, chooseMatch, hasAllWords } from "../autoMatch";

const LIST = ["free business loan", "business loan free", "loan for business free money", "sba loan", "sba loan rates"];

describe("v528 Broad match", () => {
  it("matches every word in any order, whole words only", () => {
    expect(hasAllWords("loan for business free money", "free business loan")).toBe(true);
    expect(hasAllWords("freebies business loan", "free business loan")).toBe(false);
  });
  it("uses BROAD when only reworded variants are on the list", () => {
    const d = chooseMatch("free business loan", LIST);
    expect(d.matchType).toBe("BROAD");
    expect(d.alsoBlocks).toEqual(["business loan free", "loan for business free money"]);
    expect(d.reason).toContain("in any order");
  });
  it("keeps PHRASE when the phrase itself is contained, and never BROAD over a converter", () => {
    expect(chooseMatch("sba loan", LIST).matchType).toBe("PHRASE");
    expect(chooseMatch("free business loan", LIST, ["business loan free"]).matchType).toBe("EXACT");
  });
  it("sends BROAD terms in their own request", () => {
    const batches = batchByMatch(["free business loan", "sba loan"], LIST);
    expect(batches.find((b) => b.matchType === "BROAD")?.terms).toEqual(["free business loan"]);
    expect(batches.find((b) => b.matchType === "PHRASE")?.terms).toEqual(["sba loan"]);
  });
  it("the undo list describes a Broad block in plain words", () => {
    const panel = readFileSync(path.resolve(__dirname, "../NegativesPanel.tsx"), "utf8");
    expect(panel).toContain("anything with all these words");
  });
});
