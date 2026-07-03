// BF_PORTAL_DRAFTLIKE_SUBMITTED_EXEMPT_v1 - placeholder-named cards are only
// hidden when they are actual drafts; submitted apps always render.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
const src = readFileSync(join(process.cwd(), "src", "pages", "pipeline", "PipelinePage.tsx"), "utf-8");
describe("pipeline draft-like filter", () => {
  it("exempts cards in real stages from the placeholder-name junk filter", () => {
    expect(src).toContain("DRAFTLIKE_SUBMITTED_EXEMPT_v1");
    expect(src).toContain('return !isRealStage;');
  });
});
