import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const portal = readFileSync(join(process.cwd(), "src/pages/referrer/ReferrerPortal.tsx"), "utf8");
const layout = readFileSync(join(process.cwd(), "src/pages/referrer/ReferrerPortalLayout.tsx"), "utf8");
const profile = readFileSync(join(process.cwd(), "src/pages/referrer/ReferrerProfilePage.tsx"), "utf8");

describe("referrer portal - launch readiness", () => {
  it("maps every real server pipeline_state to a board column", () => {
    expect(portal).toContain("BF_PORTAL_REFERRER_STAGE_MAP_v1");
    for (const state of [
      "Received",
      "In Review",
      "Documents Required",
      "Additional Steps Required",
      "Off to Lender",
      "Offer",
      "Accepted",
      "Rejected",
    ]) {
      expect(portal).toContain(`"${state}":`);
    }
  });

  it("treats Accepted as Funded so the Funded column populates", () => {
    expect(portal).toMatch(/"Accepted":\s*"Funded"/);
  });

  it("carries the brand header", () => {
    expect(layout).toContain("BF_PORTAL_REFERRER_BRAND_HEADER_v1");
    expect(layout).toContain("Boreal Group of Companies");
  });

  it("edit-my-info mirrors the signup field set 1:1", () => {
    expect(profile).toContain("BF_PORTAL_REFERRER_PROFILE_PARITY_v1");
    for (const f of ["street", "city", "province", "postal_code", "etransfer_email", "company_name"]) {
      expect(profile).toContain(f);
    }
  });

  it("reads the /me profile envelope, not the bare root", () => {
    expect(profile).toContain("me.profile");
  });
});
