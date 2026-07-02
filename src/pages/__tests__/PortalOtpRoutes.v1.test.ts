import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
const pages = [
  "../lender/LenderLoginPage.tsx",
  "../referrer/ReferrerLoginPage.tsx",
];
describe("lender/referrer OTP routes point at the real BF-Server endpoints", () => {
  for (const rel of pages) {
    const src = readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf-8");
    it(`${rel} uses /api/auth/otp/* and no /v1/`, () => {
      expect(src).not.toContain("/api/v1/otp");
      expect(src).toContain("/api/auth/otp/start");
      expect(src).toContain("/api/auth/otp/verify");
    });
  }
});
