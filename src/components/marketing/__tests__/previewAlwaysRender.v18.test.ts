// BF_PORTAL_PREVIEW_ALWAYS_RENDER_v18
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const src = fs.readFileSync(path.resolve(__dirname, "../BrandedEmailComposer.tsx"), "utf8");

describe("composer preview", () => {
  it("never reuses stored html when loading a template", () => {
    expect(src).not.toContain("setPreview(t.html);");
    expect(src).not.toContain("skipNextPreview.current = true;");
  });

  it("reports a failed preview request instead of rendering blank", () => {
    expect(src).toContain("Preview failed:");
    expect(src).toContain('console.error("[composer] preview request failed"');
  });

  it("reports an empty response distinctly from a failed one", () => {
    expect(src).toContain("Preview came back empty from the server.");
  });
});
