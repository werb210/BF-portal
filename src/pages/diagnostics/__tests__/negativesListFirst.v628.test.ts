// BF_PORTAL_NEGATIVES_LIST_FIRST_v628
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const panel = readFileSync(path.join(process.cwd(), "src/pages/diagnostics/NegativesPanel.tsx"), "utf8");

describe("v628 the search list comes first", () => {
  it("renders the search list before the conflicts section", () => {
    expect(panel.indexOf("Spent money, converted nothing")).toBeGreaterThan(0);
    expect(panel.indexOf("Spent money, converted nothing")).toBeLessThan(panel.indexOf('data-testid="negatives-conflicts"'));
  });
  it("folds the conflicts table until Show is clicked", () => {
    expect(panel).toContain("useState(false); // BF_PORTAL_NEGATIVES_LIST_FIRST_v628");
    expect(panel).toContain("{showConflicts && <table");
  });
  it("defaults to $1 and 1 click", () => {
    expect(panel).toContain("const [minCost, setMinCost] = useState(1);");
    expect(panel).toContain("const [minClicks, setMinClicks] = useState(1);");
  });
});
