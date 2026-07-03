// BF_PORTAL_UNNAMED_JUNK_UNLESS_SUBMITTED_v1 - placeholder-named cards are
// hidden unless submitted_at proves the application was submitted.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
const src = readFileSync(join(process.cwd(), "src", "pages", "pipeline", "PipelinePage.tsx"), "utf-8");
describe("pipeline draft-like filter", () => {
  it("unnamed cards are junk unless the application was submitted", () => {
    expect(src).toContain("UNNAMED_JUNK_UNLESS_SUBMITTED_v1");
    expect(src).toContain("return !isSubmitted;");
  });
});
