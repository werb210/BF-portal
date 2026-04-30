// BF_PORTAL_v66_LENDER_PRODUCT_NAME_BC
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("BF_PORTAL_v66_LENDER_PRODUCT_NAME_BC", () => {
  const src = readFileSync(
    join(__dirname, "..", "LenderProductsPage.tsx"),
    "utf8"
  );

  it("anchor present", () => {
    expect(src).toContain("BF_PORTAL_v66_LENDER_PRODUCT_NAME_BC");
  });

  it("buildPayload emits both `productName` and `name`", () => {
    // Find the buildPayload return statement and confirm both keys appear.
    const start = src.indexOf("const buildPayload");
    expect(start).toBeGreaterThan(-1);
    const end = src.indexOf("};", src.indexOf("required_documents:", start));
    expect(end).toBeGreaterThan(start);
    const block = src.slice(start, end);
    expect(block).toMatch(/productName:\s*__resolvedProductName_v66/);
    expect(block).toMatch(/name:\s*__resolvedProductName_v66/);
  });

  it("the resolved name is computed once, not duplicated as expressions", () => {
    // Avoids `productName: foo.trim() || ..., name: foo.trim() || ...` —
    // we want a single computation so both fields are guaranteed to match.
    const start = src.indexOf("const buildPayload");
    const end = src.indexOf("};", src.indexOf("required_documents:", start));
    const block = src.slice(start, end);
    const trimCount = (block.match(/values\.productName\.trim\(\)/g) || []).length;
    expect(trimCount).toBe(1);
  });
});
