// BF_PORTAL_COMMS_TABS_v39 - the tab that opens on arrival should be the one
// staff start in, and making Inbox the default exposed an unguarded read that
// blanked the tab.
import { describe, it, expect } from "vitest";
import fs from "fs";

const SRC = fs.readFileSync("src/pages/communications/CommunicationsPage.tsx", "utf8");

const order = (() => {
  const block = SRC.slice(SRC.indexOf("const TABS:"), SRC.indexOf("];", SRC.indexOf("const TABS:")));
  return [...block.matchAll(/id: "([a-z]+)"/g)].map((m) => m[1]);
})();

describe("communications tab order", () => {
  it("reads Inbox, SMS, Messages, Team, Phone, Issues, Maya", () => {
    expect(order).toEqual(["inbox", "sms", "messages", "team", "phone", "issues", "maya"]);
  });

  it("opens on the first tab", () => {
    expect(SRC).toContain('useState<Tab>(initialTab ?? "inbox")');
    expect(order[0]).toBe("inbox");
  });

  it("keeps all seven tabs", () => {
    expect(order).toHaveLength(7);
  });
});

describe("InboxTab survives a malformed mailbox response", () => {
  it("guards r.shared, which is read before the catch can help", () => {
    expect(SRC).toContain("(r?.shared?.length ?? 0) > 0");
    expect(SRC).not.toContain("r.shared.length > 0");
  });

  it("normalises shared to an array before storing it", () => {
    expect(SRC).toContain("Array.isArray(r?.shared) ? r.shared : []");
  });
});
