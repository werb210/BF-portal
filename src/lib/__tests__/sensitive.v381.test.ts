// BF_PORTAL_SIN_MASK_v381
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isSinKey, maskSin, redactSensitive } from "../sensitive";

describe("maskSin", () => {
  it("keeps only the last four digits", () => {
    expect(maskSin("123 456 789")).toBe("•••-••-6789");
    expect(maskSin("123-45-6789")).toBe("•••-••-6789");
    expect(maskSin(123456789)).toBe("•••-••-6789");
  });
  it("hides short values completely and falls back when empty", () => {
    expect(maskSin("12")).toBe("•••••••••");
    expect(maskSin("")).toBe("—");
    expect(maskSin(null, "")).toBe("");
  });
});

describe("isSinKey", () => {
  it.each(["ssn", "sin", "SIN", "sin_ssn", "partner_sin", "partnerSin", "guarantorSSN", "sinOrSsn",
    "applicantSinNumber", "ssn_number", "social_insurance_number", "socialSecurityNumber"])("%s is a SIN key", (k) => {
    expect(isSinKey(k)).toBe(true);
  });
  it.each(["business", "cousin", "basin", "since", "addressSince", "singleOwner", "email", ""])("%s is not", (k) => {
    expect(isSinKey(k)).toBe(false);
  });
});

describe("redactSensitive", () => {
  it("masks nested SIN values and leaves everything else", () => {
    const out = redactSensitive({
      applicant: { firstName: "Ann", ssn: "123456789", partner: { partnerSin: "987654321" } },
      guarantors: [{ sin: "111222333", name: "Bo" }],
      business: "Acme",
    });
    expect(out.applicant.ssn).toBe("•••-••-6789");
    expect(out.applicant.partner.partnerSin).toBe("•••-••-4321");
    expect(out.guarantors[0].sin).toBe("•••-••-2333");
    expect(out.applicant.firstName).toBe("Ann");
    expect(out.business).toBe("Acme");
    expect(JSON.stringify(out)).not.toMatch(/123456789|987654321|111222333/);
  });
});

describe("every display path uses the mask", () => {
  const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
  it("CRM panels mask the SIN row", () => {
    expect(read("src/components/crm/ContactApplicationDetails.tsx")).toContain("isSinKey(k) ? maskSin(");
  });
  it("raw JSON views redact before printing", () => {
    for (const p of [
      "src/pages/applications/bi/viewer/BIApplicationDrawer.tsx",
      "src/pages/applications/slf/viewer/SLFTabApplication.tsx",
      "src/silos/bi/pipeline/tabs/PgiCommsTab.tsx",
      "src/silos/bi/pipeline/tabs/InsurerResponseTab.tsx",
      "src/pages/BiApplications.tsx",
    ]) {
      const src = read(p);
      expect(src).toContain("redactSensitive(");
      expect(src).not.toMatch(/JSON\.stringify\((?!redactSensitive)[^)]*null, 2\)/);
    }
  });
});
