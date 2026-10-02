// BF_PORTAL_SMS_SEND_SAFETY_v710
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
const dash = readFileSync("src/pages/marketing/MarketingDashboard.tsx", "utf8");
const sms = dash.slice(dash.indexOf("function SmsComposerPanel()"));
describe("SMS campaign composer", () => {
  it("shows the server's exact audience, not the segment contact count", () => {
    expect(sms).toContain("/api/marketing/sms/audience-count");
    expect(sms).toContain("const count = exact ?? 0;");
  });
  it("sends the confirmed number so the server can refuse a changed audience", () => {
    expect(sms).toContain("payload.expectedCount = count;");
  });
  it("tells the truth in the confirmation: queued with a 5-minute hold, one text per phone", () => {
    expect(sms).toContain("one text per phone number");
    expect(sms).toContain("It goes out in 5 minutes and you can cancel until then.");
    expect(sms).not.toContain('setMsg("Send failed.")');
  });
});
