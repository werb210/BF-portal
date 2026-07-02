import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
const pages = ["../lender/LenderLoginPage.tsx", "../referrer/ReferrerLoginPage.tsx"];
describe("lender/referrer login is phone-only", () => {
  for (const rel of pages) {
    const src = readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf-8");
    it(`${rel} no longer collects name/email`, () => {
      expect(src).not.toContain('placeholder="Full Name"');
      expect(src).not.toContain('placeholder="Email"');
      expect(src).not.toContain("name, email, phone");
    });
  }
});
