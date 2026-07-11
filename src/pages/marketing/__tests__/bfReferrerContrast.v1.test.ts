// BF_PORTAL_REFERRER_CONTRAST_v1
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
const src = readFileSync(path.join(process.cwd(), "src/pages/marketing/BFReferrerManagement.tsx"), "utf8");
describe("referrer management contrast", () => {
  it("uses no white-on-white text classes", () => {
    expect(src).not.toContain("text-white");
    expect(src).not.toContain("bg-white/5");
  });
  it("heading uses a legible dark color", () => {
    expect(src).toContain("Referrer Management");
    expect(src).toContain("text-gray-900");
  });
});
