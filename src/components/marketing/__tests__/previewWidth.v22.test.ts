// BF_PORTAL_PREVIEW_FULL_WIDTH_v22
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const src = readFileSync("src/components/marketing/BrandedEmailComposer.tsx", "utf8");

// The scale maths, extracted so the behaviour is testable without a DOM.
const EMAIL_PREVIEW_WIDTH = 600;
const EMAIL_PREVIEW_MAX_SCALE = 2;
const scaleFor = (paneWidth: number) =>
  Math.min(EMAIL_PREVIEW_MAX_SCALE, paneWidth / EMAIL_PREVIEW_WIDTH);

describe("preview scaling", () => {
  it("fills a wide pane instead of stopping at 600px", () => {
    expect(scaleFor(1200)).toBe(2);
    expect(scaleFor(900)).toBe(1.5);
  });

  it("still shrinks on a narrow pane", () => {
    expect(scaleFor(300)).toBe(0.5);
  });

  it("caps so a very wide monitor does not distort the email", () => {
    expect(scaleFor(4000)).toBe(EMAIL_PREVIEW_MAX_SCALE);
  });

  it("renders at exactly 1x when the pane is the email's own width", () => {
    expect(scaleFor(600)).toBe(1);
  });
});

describe("the component uses that maths", () => {
  it("no longer caps the scale at 1", () => {
    expect(src).not.toContain("Math.min(1, pane.clientWidth");
    expect(src).toContain("Math.min(EMAIL_PREVIEW_MAX_SCALE, pane.clientWidth");
  });

  it("uses a named height rather than a magic 520", () => {
    expect(src).toContain("EMAIL_PREVIEW_HEIGHT");
    expect(src).not.toContain("height: 520");
  });

  it("keeps the iframe at the email's true width and scales it", () => {
    expect(src).toContain("width: EMAIL_PREVIEW_WIDTH,");
    expect(src).toContain("transform: `scale(${previewScale})`");
  });
});
