// BF_PORTAL_EMAIL_TWO_COLUMN_v1
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
    expect(src).toContain('body2: string;');
  });

  it("offers heading, body, image, and image-link controls", () => {
    expect(src).toContain("Second column (optional)");
    expect(src).toContain('set("headline2", e.target.value)');
    expect(src).toContain('set("body2", e.target.value)');
    expect(src).toContain('upload(f, "rightImageUrl")');
    expect(src).toContain('set("rightImageLink", e.target.value)');
  });

  it("previews and sends the complete template object", () => {
    expect(src).toContain('api.post<any>(`${apiBase}/email/template/preview`, tpl)');
    expect(src).toContain("const payload: Record<string, unknown> = { subject, ...tpl }");
  });
});
