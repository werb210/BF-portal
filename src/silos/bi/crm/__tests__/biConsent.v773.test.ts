// BF_PORTAL_BI_CONSENT_v773
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
const src = readFileSync("src/silos/bi/crm/BIOutreach.tsx", "utf8");
describe("BI outreach can record CASL consent", () => {
  it("offers the three bases when contacts are skipped for no consent", () => {
    expect(src).toContain('s?.reason === "no_consent_basis"');
    for (const b of ['value="express"', 'value="implied_published"', 'value="implied_relationship"']) expect(src).toContain(b);
  });
  it("records the basis on BI-Server, then enrolls the same contacts", () => {
    const fn = src.slice(src.indexOf("const recordConsentAndEnroll"), src.indexOf("const addSelectedToSequence"));
    expect(fn.indexOf("/api/v1/bi/crm/outreach/contacts/consent")).toBeLessThan(fn.indexOf("/enroll"));
  });
});
