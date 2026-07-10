// BF_PORTAL_REFERRER_UNIFY_UI_v1
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const r = (p: string) => readFileSync(path.join(process.cwd(), p), "utf8");

describe("referrer unify UI", () => {
  it("login no longer resets the auto-verify guard on failure (loop fix)", () => {
    const src = r("src/pages/referrer/ReferrerLoginPage.tsx");
    // The exact bug: verify()'s catch reset the guard right before the
    // "Invalid code" error, which re-fired the same code forever. That precise
    // pairing must be gone. (The "Change number" button legitimately resets it.)
    expect(src).not.toContain(
      'autoVerifiedFor.current = null;\n      setErr(e instanceof Error ? e.message : "Invalid code")',
    );
  });

  it("add-referral form has silo picker and message picker", () => {
    const src = r("src/pages/referrer/ReferrerPortal.tsx");
    expect(src).toContain("first_name");
    expect(src).toContain("business_name");
    expect(src).toContain("silos");
    expect(src).toContain('message');
    expect(src).toContain("BF_PORTAL_REFERRER_UNIFY_UI_v1");
  });

  it("BI lender page no longer renders the Referrers subtab", () => {
    const src = r("src/silos/bi/lender/BILender.tsx");
    expect(src).not.toContain("BIReferrerManagement");
  });
});
