// REFERRER_BF_WIRING_v1 - the BF referrer portal must call BF-Server endpoints
// (no /v1/, no BI paths) and group referrals by BF pipeline stages, not the
// insurance PGI stages the scaffold shipped with.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const portal = readFileSync(path.join(process.cwd(), "src", "pages", "referrer", "ReferrerPortal.tsx"), "utf-8");
const login = readFileSync(path.join(process.cwd(), "src", "pages", "referrer", "ReferrerLoginPage.tsx"), "utf-8");
const profile = readFileSync(path.join(process.cwd(), "src", "pages", "referrer", "ReferrerProfilePage.tsx"), "utf-8");

describe("referrer portal endpoints", () => {
  it("calls BF-Server referrer routes, not the dead BI paths", () => {
    expect(portal).toContain('"/api/referrer/pipeline"');
    expect(portal).toContain('"/api/referrer/add-referral"');
    expect(profile).toContain('"/api/referrer/profile"');
    expect(portal).not.toContain("/api/v1/bi/");
    expect(profile).not.toContain("/api/v1/bi/");
  });
  it("sends userType:referrer on both otp start and verify", () => {
    const hits = login.split('userType: "referrer"').length - 1;
    expect(hits).toBe(2);
  });
});

describe("referrer portal stages", () => {
  it("uses BF pipeline stages, not insurance PGI stages", () => {
    expect(portal).toContain("REFERRER_BF_WIRING_v1");
    expect(portal).toContain("BF_STAGES");
    expect(portal).not.toContain("PGI_STAGES");
    expect(portal).not.toContain("pgiStages");
  });
});
