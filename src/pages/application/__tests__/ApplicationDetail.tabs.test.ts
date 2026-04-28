// BF_NO_OVERVIEW_v41 — Block 41-C — Overview must never reappear.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

describe("ApplicationDetail tabs", () => {
  const src = readFileSync(join(process.cwd(), "src/pages/application/ApplicationDetail.tsx"), "utf-8");
  it("does not list an Overview tab", () => {
    expect(src).not.toMatch(/key:\s*"overview"/);
    expect(src).not.toMatch(/label:\s*"Overview"/);
  });
  it("does not import OverviewTab", () => {
    expect(src).not.toMatch(/OverviewTab/);
  });
  it("falls back to 'application' tab when path has no match", () => {
    expect(src).toMatch(/\?\?\s*"application"/);
  });
});
