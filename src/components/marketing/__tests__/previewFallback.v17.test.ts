// BF_PORTAL_PREVIEW_FALLBACK_v17
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const src = fs.readFileSync(path.resolve(__dirname, "../BrandedEmailComposer.tsx"), "utf8");

describe("loading a template with no stored html", () => {
  it("no longer skips the render unconditionally", () => {
    expect(src).not.toContain('skipNextPreview.current = true;\n                setPreview(t.html ?? "");');
  });

  it("only reuses stored html when it exists", () => {
    expect(src).toContain("if (t.html) {");
    expect(src).toContain("setPreview(t.html);");
  });

  it("still skips the render when html IS present, to avoid a redundant round trip", () => {
    expect(src).toContain("skipNextPreview.current = true;");
  });
});
