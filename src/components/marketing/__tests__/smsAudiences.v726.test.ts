// BF_PORTAL_SMS_AUDIENCES_v726
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
const dash = readFileSync("src/pages/marketing/MarketingDashboard.tsx", "utf8");
describe("SMS audiences", () => {
  it("offers the server's audiences in the audience list, counted exactly on the Send button", () => {
    expect(dash).toContain("(seg?.audiences ?? []).map((a) => <option key={a.tag} value={a.tag}>{a.label}</option>)");
    expect(dash).toContain("/api/marketing/sms/audience-count");
  });
});
