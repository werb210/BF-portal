// BF_PORTAL_PREVIEW_DEBOUNCE_v1
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const src = readFileSync(path.join(process.cwd(), "src/components/marketing/BrandedEmailComposer.tsx"), "utf8");
const effect = src.slice(src.indexOf("BF_PORTAL_PREVIEW_DEBOUNCE_v1"), src.indexOf("const upload = async"));

describe("the preview does not fire a request per keystroke", () => {
  it("debounces the preview POST", () => {
    expect(effect).toContain("setTimeout(() => {");
    expect(effect).toContain("}, 400);");
  });
  it("clears the pending call when the draft changes again", () => {
    expect(effect).toContain("clearTimeout(timer)");
  });
  it("still abandons an in-flight response after unmount", () => {
    expect(effect).toContain("alive = false");
    expect(effect).toContain("if (!alive) return;");
  });
  it("keeps the audience-count debounce that was already there", () => {
    expect(src).toContain("}, 250);");
  });
});
