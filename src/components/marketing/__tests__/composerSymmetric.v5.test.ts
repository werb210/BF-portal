// BF_PORTAL_EMAIL_SYMMETRIC_LAYOUT_v5
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const src = readFileSync(path.join(process.cwd(), "src/components/marketing/BrandedEmailComposer.tsx"), "utf8");

describe("symmetric email composer", () => {
  it("has no full-width image control", () => {
    expect(src).not.toContain("Full-width image below the frame");
    expect(src).not.toContain("image2Url\", e.target.value");
    expect(src).not.toContain("img2Ref");
  });

  it("builds both columns from one definition, so they cannot drift", () => {
    expect(src).toContain('const columnFields = (side: "left" | "right")');
    expect(src).toContain('{columnFields("left")}');
    expect(src).toContain('{columnFields("right")}');
  });

  it("orders each column headline, image, click link, body, button", () => {
    const col = src.slice(src.indexOf("const columnFields"), src.indexOf("return (\n    <section"));
    const order = ["Headline", ">Image", "Image click link", ">Body", "Button label", "Button link"];
    let at = -1;
    for (const label of order) {
      const next = col.indexOf(label, at + 1);
      expect(next).toBeGreaterThan(at);
      at = next;
    }
  });

  it("maps the left column to the fields the renderer treats as left", () => {
    const col = src.slice(src.indexOf("const columnFields"));
    expect(col).toContain('isLeft ? "heroUrl" : "rightImageUrl"');
    expect(col).toContain('isLeft ? "heroLink" : "rightImageLink"');
    expect(col).toContain('isLeft ? "ctaLabel" : "cta2Label"');
  });

  it("puts audience above load template and subject", () => {
    expect(src.indexOf("Audience")).toBeLessThan(src.indexOf("Load template"));
    expect(src.indexOf("Load template")).toBeLessThan(src.indexOf(">Subject"));
  });

  it("keeps the controls that are not part of the email", () => {
    for (const control of ["Save draft", "Save to library", "Send test", "Cancel send", "Preview", "Landing page URL"]) {
      expect(src).toContain(control);
    }
  });

  it("offers the 24h resend override and sends it", () => {
    expect(src).toContain("Send again within 24h");
    expect(src).toContain("...tpl, resend }");
  });
});
