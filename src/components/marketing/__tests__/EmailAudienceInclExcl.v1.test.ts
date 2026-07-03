// EMAIL_AUDIENCE_INCL_EXCL_v1 - branded email composer audience is two
// multi-tag pickers (include/exclude) with a live combined recipient count.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
const src = readFileSync(join(process.cwd(), "src", "components", "marketing", "BrandedEmailComposer.tsx"), "utf-8");
describe("branded email audience include/exclude", () => {
  it("sends tags/excludeTags arrays instead of a single tag", () => {
    expect(src).toContain("payload.tags = include");
    expect(src).toContain("payload.excludeTags = exclude");
    expect(src).not.toContain('payload.tag = tag');
  });
  it("previews the combined recipient count from the server", () => {
    expect(src).toContain("/api/marketing/email/audience-count");
  });
  it("renders two multi-select tag pickers", () => {
    expect(src).toContain('title="Include tags"');
    expect(src).toContain('title="Exclude tags"');
  });
});
