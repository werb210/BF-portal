// BF_PORTAL_PREVIEW_FALLBACK_v17
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const src = fs.readFileSync(path.resolve(__dirname, "../BrandedEmailComposer.tsx"), "utf8");

describe("loading a template preview", () => {
  it("never skips rendering from the loaded fields", () => {
    expect(src).not.toContain("skipNextPreview.current");
  });

  it("clears the old preview while the new one renders", () => {
    expect(src).toContain('setPreview("");');
  });

  it("does not reuse stored html even when it exists", () => {
    expect(src).not.toContain("setPreview(t.html);");
  });
});
