// BF_PORTAL_LENDER_HEADER_v1 + LENDER_BLURBS_v1 - the lender one-page portal has
// a staff-style header (logo + Boreal Financial Group + Welcome firstname -
// lender) and instructional blurbs above each section.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const src = readFileSync(join(process.cwd(), "src", "pages", "lender", "LenderPortalPage.tsx"), "utf-8");

describe("lender portal header + blurbs", () => {
  it("header shows logo, Boreal Financial Group, and Welcome firstname - lender", () => {
    expect(src).toContain("logo-boreal-mountains-white");
    expect(src).toContain("Boreal Financial Group");
    expect(src).toContain("profile.contact_name");
    expect(src).toContain("Welcome");
  });

  it("has the three section blurbs incl the LOC example + mailto", () => {
    expect(src).toContain("Please ensure all your company information is correct");
    expect(src).toContain("required documents A, B, and C");
    expect(src).toContain("mailto:info@boreal.financial");
    expect(src).toContain("Please provide any marketing or product information sheets");
  });
});
