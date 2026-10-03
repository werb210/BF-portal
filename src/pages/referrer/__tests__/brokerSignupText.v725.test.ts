// BF_PORTAL_BROKER_SIGNUP_TEXT_v725
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
const src = readFileSync("src/pages/referrer/ReferrerSignupPage.tsx", "utf8");
describe("broker sign-up wording", () => {
  it("brokers see broker wording and title; referrers keep theirs", () => {
    expect(src).toContain("Sign the broker agreement below to get started");
    expect(src).toContain('isBroker ? "Broker Portal | Boreal Financial" : "Become a Referral Partner | Boreal Financial"');
    expect(src).toContain("referral agreement below to get started - it takes a few minutes.");
  });
});
