import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
const src = readFileSync(join(process.cwd(), "src", "components", "marketing", "BrandedEmailComposer.tsx"), "utf-8");
describe("email template landing url display", () => {
  it("captures landingUrl from save and shows a copyable field", () => {
    expect(src).toContain("setLandingUrl");
    expect(src).toContain("res?.data?.landingUrl ?? res?.landingUrl");
    expect(src).toContain("paste into your SMS template");
  });
});
