// BF_PORTAL_BLOCK_v500_SMS_SEGMENTS_AND_DELIVERY
import { describe, it, expect } from "vitest";
import { smsSegments } from "../smsSegments";
import { smsDeliveryTag } from "../smsDeliveryStatus";

describe("v500 SMS segments", () => {
  it("counts plain text at 160 then 153 per text", () => {
    expect(smsSegments("a".repeat(160)).segments).toBe(1);
    expect(smsSegments("a".repeat(161)).segments).toBe(2);
    expect(smsSegments("a".repeat(306)).segments).toBe(2);
    expect(smsSegments("a".repeat(307)).segments).toBe(3);
  });
  it("switches to 70 then 67 per text for emoji or curly quotes", () => {
    expect(smsSegments("Hi \u{1F44B}").unicode).toBe(true);
    expect(smsSegments("\u2019".repeat(70)).segments).toBe(1);
    expect(smsSegments("\u2019".repeat(71)).segments).toBe(2);
  });
  it("counts extended characters as two", () => {
    expect(smsSegments("\u20ac".repeat(80)).segments).toBe(1);
    expect(smsSegments("\u20ac".repeat(81)).segments).toBe(2);
  });
});

describe("v500 delivery tag", () => {
  it("delivered, failed with reason, pending", () => {
    expect(smsDeliveryTag("delivered", null)).toEqual({ tone: "success", text: "Delivered" });
    expect(smsDeliveryTag("undelivered", "30034")?.text).toContain("not yet registered for US texting");
    expect(smsDeliveryTag("sent", null)).toEqual({ tone: "muted", text: "Sent" });
    expect(smsDeliveryTag(null, null)).toBeNull();
  });
});
