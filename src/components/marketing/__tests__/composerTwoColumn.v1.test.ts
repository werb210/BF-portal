// BF_PORTAL_EMAIL_TWO_COLUMN_v1
// BF_PORTAL_COMPOSER_TESTS_SYMMETRIC_v6 - rewritten for the symmetric layout.
// The original pinned a "Second column (optional)" fieldset and hardcoded
// set("headline2", ...) calls. Both columns are now produced by one
// columnFields() definition, so those literals no longer exist - but the
// behaviour they protected does, and is asserted here instead.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const src = readFileSync(
  join(process.cwd(), "src/components/marketing/BrandedEmailComposer.tsx"),
  "utf8",
);

describe("branded email composer two-column fields v1", () => {
  it("defines empty canonical second-column fields without changing old drafts", () => {
    expect(src).toContain('headline2: "", body2: "", rightImageUrl: "", rightImageLink: ""');
    expect(src).toContain("body2: string;");
  });

  it("offers heading, body, image, and image-link controls for the right column", () => {
    // Generated rather than hardcoded, so assert the mapping that produces them.
    expect(src).toContain('const headlineKey = isLeft ? "headline" : "headline2";');
    expect(src).toContain('const bodyKey = isLeft ? "body" : "body2";');
    expect(src).toContain('const imageKey = isLeft ? "heroUrl" : "rightImageUrl";');
    expect(src).toContain('const imageLinkKey = isLeft ? "heroLink" : "rightImageLink";');
    expect(src).toContain('upload(f, imageKey as "heroUrl" | "rightImageUrl")');
  });

  it("previews and sends the complete template object", () => {
    expect(src).toContain("api.post<any>(`${apiBase}/email/template/preview`, tpl)");
    // ...tpl still spreads every field; `resend` rides alongside it.
    expect(src).toContain("const payload: Record<string, unknown> = { subject, ...tpl, resend };");
  });
});
