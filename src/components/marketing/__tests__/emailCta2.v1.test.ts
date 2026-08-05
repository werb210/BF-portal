// BF_PORTAL_EMAIL_CTA2_v1
// BF_PORTAL_COMPOSER_TESTS_SYMMETRIC_v6 - rewritten for the symmetric layout.
// The full-width image below the frame is deliberately gone: it rendered
// outside the column table, so a two-column email carried a stray banner under
// both columns. The email is now exactly two columns and nothing else.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const composer = readFileSync(
  join(process.cwd(), "src", "components", "marketing", "BrandedEmailComposer.tsx"),
  "utf-8",
);

describe("BF_PORTAL_EMAIL_CTA2_v1", () => {
  it("carries the right-column button through the template shape", () => {
    expect(composer).toContain("cta2Label: string;");
    expect(composer).toContain('cta2Label: "", cta2Url: "",');
  });

  it("gives each column its own button controls", () => {
    expect(composer).toContain('const ctaLabelKey = isLeft ? "ctaLabel" : "cta2Label";');
    expect(composer).toContain('const ctaUrlKey = isLeft ? "ctaUrl" : "cta2Url";');
    // One definition renders both, so the columns cannot drift apart.
    expect(composer).toContain('{columnFields("left")}');
    expect(composer).toContain('{columnFields("right")}');
  });

  it("offers exactly one image per column and nothing outside them", () => {
    expect(composer).not.toContain("Full-width image below the frame");
    expect(composer).not.toContain("image2Url");
    expect(composer).not.toContain("img2Ref");
    expect(composer).toContain("Image click link");
  });

  it("warns that a label alone renders nothing", () => {
    expect(composer).toContain("A button needs both a label and a link.");
  });
});
