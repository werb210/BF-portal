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

  it("puts the button controls inside the second-column fieldset", () => {
    const fieldset = composer.slice(composer.indexOf("Second column (optional)"));
    expect(fieldset).toContain('set("cta2Label"');
    expect(fieldset).toContain('set("cta2Url"');
  });

  it("says where each picture actually lands", () => {
    expect(composer).toContain("Full-width image below the frame (optional)");
    expect(composer).toContain("Image (inside this column)");
    expect(composer).not.toContain("Second image (optional)");
  });

  it("warns that a label alone renders nothing", () => {
    expect(composer).toContain("Both a label and a link are needed");
  });
});
