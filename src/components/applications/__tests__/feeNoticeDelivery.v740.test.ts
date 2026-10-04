// BF_PORTAL_FEE_NOTICE_DELIVERY_v740
import { describe, expect, it } from "vitest";
import { describeDelivery, noticeLine } from "../FeeAgreementPanel";

describe("fee agreement delivery wording", () => {
  it("names each channel that went out", () => {
    const r = describeDelivery({ push: true, sms: true, email: true, phoneLast4: "0100", emailTo: "dana@example.com", errors: [] });
    expect(r.ok).toBe(true);
    expect(r.text).toBe("Sent: texted to the mobile ending 0100, emailed to dana@example.com, app notice sent.");
  });
  it("shows what failed next to what worked", () => {
    const r = describeDelivery({ push: false, sms: false, email: true, phoneLast4: "0100", emailTo: "a@b.ca", errors: ["text failed: unsubscribed"] });
    expect(r.ok).toBe(true);
    expect(r.text).toContain("Not delivered: text failed: unsubscribed");
  });
  it("labels recent notices", () => {
    expect(noticeLine({ channel: "sms", error: null, createdAt: "2026-10-04T17:50:00Z" })).toContain("Text sent");
    expect(noticeLine({ channel: "none", error: "no usable mobile", createdAt: "2026-10-04T17:50:00Z" })).toContain("Not sent: no usable mobile");
  });
});
