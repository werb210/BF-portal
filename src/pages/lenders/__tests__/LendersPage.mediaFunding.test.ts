// BF_LP_MEDIA_FUNDING_GATE_v41 — Block 41-C
// Lock the inverted visibility rule. If anyone flips this back, fail red.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

describe("LendersPage MEDIA_FUNDING required-docs visibility", () => {
  const src = readFileSync(join(process.cwd(), "src/pages/lenders/LendersPage.tsx"), "utf-8");
  it("hides Core Underwriting Pack when category === MEDIA_FUNDING", () => {
    // Core block is now gated on `!== "MEDIA_FUNDING"`.
    expect(src).toMatch(/form\.category !== "MEDIA_FUNDING"[\s\S]*Core Underwriting Pack/);
  });
  it("shows Conditional ONLY when category === MEDIA_FUNDING", () => {
    expect(src).toMatch(/form\.category === "MEDIA_FUNDING"[\s\S]*Conditional/);
  });
  it("does not have the legacy backwards Conditional gate", () => {
    // Old code: `form.category !== "MEDIA_FUNDING" ... Conditional` — must be gone.
    expect(src).not.toMatch(/form\.category !== "MEDIA_FUNDING"[\s\S]{0,200}Conditional/);
  });
});
