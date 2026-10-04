// BF_PORTAL_WWW_AND_FEE_COLOUR_v744
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("portal tidy-ups", () => {
  it("a waiting fee agreement shows calm blue, not a warning colour", () => {
    const s = readFileSync("src/components/applications/FeeAgreementPanel.tsx", "utf8");
    expect(s).toContain('background: signed ? "#ecfdf5" : "#eff6ff"');
    expect(s).not.toContain('"#fef3c7"');
  });
  it("campaign links default to www", () => {
    expect(readFileSync("src/pages/marketing/MarketingDashboard.tsx", "utf8")).toContain('useState("https://www.boreal.financial")');
  });
});
