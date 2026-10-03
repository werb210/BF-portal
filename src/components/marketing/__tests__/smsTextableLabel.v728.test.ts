// BF_PORTAL_SMS_TEXTABLE_LABEL_v728
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
const dash = readFileSync("src/pages/marketing/MarketingDashboard.tsx", "utf8");
describe("SMS audience wording", () => {
  it("says the number is people you can text, and explains the rest", () => {
    expect(dash).toContain("Everyone you can text ({seg?.all ?? 0})");
    expect(dash).not.toContain("All contacts with a mobile (");
    expect(dash).toContain("can't be texted: no consent on record, consent expired, opted out, or not a Canadian mobile.");
  });
});
