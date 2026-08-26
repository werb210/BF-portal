// BF_PORTAL_SBA_PACK_TRIMMED_v206
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const src = readFileSync(resolve(__dirname, "..", "LendersPage.tsx"), "utf-8");
const sbaStart = src.indexOf("const sbaTypes");
const sbaBlock = src.slice(sbaStart, src.indexOf("const [form, setForm]", sbaStart));

describe("the pack matches the server", () => {
  it("carries eight documents", () => { expect((sbaBlock.match(/key: "/g) || []).length).toBe(8); });
  it("no longer lists debt_schedule", () => { expect(sbaBlock).not.toContain('key: "debt_schedule"'); });
  it("marks the two optional ones", () => {
    expect(sbaBlock).toContain('key: "lease_or_loi", label: "Lease or letter of intent - only if the loan involves premises", required: false');
    expect(sbaBlock).toContain('key: "sba_1919_attachments", label: "Supporting detail for any Yes answer on Form 1919", required: false');
  });
  it("keeps the SOP-mandated ones required", () => {
    for (const k of ["personal_tax_returns", "formation_documents", "business_plan", "owner_photo_id"]) {
      const line = sbaBlock.split("\n").find((l) => l.includes(`key: "${k}"`)) ?? "";
      expect(line).toContain("required: true");
    }
  });
  it("the photo ID label names what counts", () => { expect(sbaBlock).toContain("driver's licence, passport or state ID"); });
});

describe("an SBA product shows its own pack only", () => {
  it("skips Always Required, so bank statements are not attached", () => { expect(src).toContain('form.category !== "MEDIA" && form.category !== "SBA_GOVERNMENT"'); });
  it("skips the Core Underwriting Pack", () => {
    const both = src.match(/form\.category !== "MEDIA" && form\.category !== "SBA_GOVERNMENT"/g) || [];
    expect(both.length).toBe(2);
  });
  it("still renders the SBA pack for SBA", () => { expect(src).toContain('form.category === "SBA_GOVERNMENT" && ('); });
  it("leaves every other category untouched", () => {
    expect(src).toContain("Core Underwriting Pack"); expect(src).toContain("Always Required");
  });
});
