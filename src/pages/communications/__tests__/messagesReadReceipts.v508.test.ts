// BF_PORTAL_BLOCK_v508_MESSAGES_READ_RECEIPTS
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const page = readFileSync(resolve(__dirname, "../CommunicationsPage.tsx"), "utf8");

describe("v508 read receipts on client Messages", () => {
  it("staff messages carry Delivered or Read", () => {
    expect(page).toContain('if (!readAt) return { tone: "muted", text: "Delivered" };');
    expect(page).toContain('delivery: (m.senderType === "staff" || m.source === "staff") ? readReceipt(m.readAt) : null');
  });
});
