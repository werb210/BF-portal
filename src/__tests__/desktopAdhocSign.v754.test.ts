// BF_PORTAL_DESKTOP_ADHOC_SIGN_v754
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

describe("the Mac app is signed so macOS shows its notifications", () => {
  it("is ad-hoc signed (not unsigned) until the Apple Developer ID is set up", () => {
    const mac = JSON.parse(readFileSync("desktop/package.json", "utf8")).build.mac;
    expect(mac.identity).toBe("-");
    expect(mac.hardenedRuntime).toBe(false);
  });
  it("the Mac build fails if the app is not validly signed", () => {
    const wf = readFileSync(".github/workflows/desktop.yml", "utf8");
    expect(wf).toContain('codesign --verify --deep --strict --verbose=2 "$app"');
  });
});
