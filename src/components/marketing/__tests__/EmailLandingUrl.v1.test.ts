import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
const src = readFileSync(fileURLToPath(new URL("../BrandedEmailComposer.tsx", import.meta.url)), "utf-8");
describe("email template landing url display", () => {
  it("captures landingUrl from save and shows a copyable field", () => {
    expect(src).toContain("setLandingUrl");
    expect(src).toContain("res?.data?.landingUrl ?? res?.landingUrl");
    expect(src).toContain("paste into your SMS template");
  });
});
