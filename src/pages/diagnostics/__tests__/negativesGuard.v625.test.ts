// BF_PORTAL_NEGATIVES_GUARD_v625
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { batchByMatch, chooseMatch } from "../autoMatch";

const panel = readFileSync(path.join(process.cwd(), "src/pages/diagnostics/NegativesPanel.tsx"), "utf8");

describe("v625 exact by default", () => {
  it("a ticked term blocks only itself unless widened", () => {
    const all = ["loan canada", "small business loan canada", "term loan canada"];
    expect(chooseMatch("loan canada", all, [], false).matchType).toBe("EXACT");
    expect(chooseMatch("loan canada", all, [], true).matchType).toBe("PHRASE");
  });
  it("batches only widened terms wider than EXACT", () => {
    const all = ["loan canada", "small business loan canada", "open a coffee shop", "coffee shop loan"];
    const batches = batchByMatch(["loan canada", "open a coffee shop"], all, [], new Set(["open a coffee shop"]));
    const exact = batches.find((b) => b.matchType === "EXACT");
    expect(exact?.terms).toContain("loan canada");
  });
  it("a protected search keeps a widened term EXACT", () => {
    const d = chooseMatch("loan canada", ["loan canada", "term loan canada"], ["small business loan canada"], true);
    expect(d.matchType).toBe("EXACT");
  });
});

describe("v625 panel", () => {
  it("asks for min clicks and uses the server's protected searches", () => {
    expect(panel).toContain("minClicks=");
    expect(panel).toContain("meta.protectedTerms");
    expect(panel).toContain("minClicks, setMinClicks] = useState(");
  });
  it("warns when Google records no conversions or the keyword check failed", () => {
    expect(panel).toContain("negatives-no-conversions");
    expect(panel).toContain('meta.keywordCheck !== "ok"');
  });
  it("lists conflicting negatives with a Remove button", () => {
    expect(panel).toContain("/api/marketing/negative-conflicts");
    expect(panel).toContain("/api/marketing/negative-conflicts/remove");
    expect(panel).toContain("also block similar searches");
  });
});
