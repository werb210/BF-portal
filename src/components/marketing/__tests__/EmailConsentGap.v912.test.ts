// BF_PORTAL_v912_EMAIL_CONSENT_RECORD
import { describe, expect, it } from "vitest";
import { canRecord, consentGapPath } from "../EmailConsentGap";

describe("email consent gap", () => {
  it("builds the gap path with and without tags", () => {
    expect(consentGapPath("/api/marketing", [])).toBe("/api/marketing/email/consent-gap");
    expect(consentGapPath("/api/marketing", ["Lender", "BF list"])).toBe("/api/marketing/email/consent-gap?tags=Lender%2CBF%20list");
  });
  it("needs a source of at least 5 characters and the confirm tick", () => {
    expect(canRecord("list", true)).toBe(false);
    expect(canRecord("Imported marketing list", false)).toBe(false);
    expect(canRecord("  Imported marketing list ", true)).toBe(true);
  });
});
