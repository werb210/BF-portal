// BF_PORTAL_BLOCK_v498_SMS_ATTACH_PICTURE
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const page = readFileSync(resolve(__dirname, "../CommunicationsPage.tsx"), "utf8");

describe("v498 SMS attach", () => {
  it("has an attach button limited to picture and PDF types", () => {
    expect(page).toContain('data-testid="sms-attach-button"');
    expect(page).toContain('accept="image/jpeg,image/png,image/gif,application/pdf"');
    expect(page).toContain("file.size > 5 * 1024 * 1024");
  });
  it("sends the media with the text and allows a picture with no words", () => {
    expect(page).toContain("...(smsMedia ? { media: smsMedia } : {})");
    expect(page).toContain("disabled={(!draft.trim() && !smsMedia) || sending}");
  });
});
