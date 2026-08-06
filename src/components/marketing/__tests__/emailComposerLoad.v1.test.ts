import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const src = readFileSync(
  join(process.cwd(), "src", "components", "marketing", "BrandedEmailComposer.tsx"),
  "utf-8",
);

describe("email library template loading", () => {
  it("regenerates rendered HTML from the loaded template fields", () => {
    expect(src).not.toContain("skipNextPreview.current");
    expect(src).not.toContain("setPreview(t.html)");
    expect(src).toContain('setPreview("")');
  });

  it("restores and clears the template landing-page URL", () => {
    expect(src).toContain('setLandingUrl(t.landingUrl ?? "")');
    expect(src).toMatch(/else\s*{[\s\S]*?setCurrentTemplateId\(null\);[\s\S]*?setLandingUrl\(""\)/);
  });

  it("describes test-send acceptance accurately and exposes hard failures", () => {
    expect(src).toContain("Acceptance is not delivery");
    expect(src).toContain("sender authentication");
    expect(src).toContain("suppression lists");
    expect(src).toContain("e instanceof Error ? e.message : String(e)");
  });
});
