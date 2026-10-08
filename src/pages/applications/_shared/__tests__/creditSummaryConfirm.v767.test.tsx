// BF_PORTAL_CS_CONFIRM_v767
import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";

describe("credit summary research facts", () => {
  const src = readFileSync("src/pages/applications/_shared/CreditSummaryV2.tsx", "utf8");
  it("a confirmed or rejected fact shows its result instead of the same buttons", () => {
    expect(src).toContain("setDecided((d) => ({ ...d, [factId]: status }))");
    expect(src).toContain('data-testid="cs2-fact-decided"');
  });
  it("Research reports a number, not [object Object]", () => {
    expect(src).toContain('typeof json?.found === "number" ? json.found : Array.isArray(json?.facts) ? json.facts.length');
  });
});
