// BF_PORTAL_COMMS_TABS_v39 - the tab that opens on arrival should be the one
// staff start in, while valid deep-linked tab parameters may override the
// default. Inbox remains the fallback and first configured tab.
import { describe, it, expect } from "vitest";
import fs from "fs";

const SRC = fs.readFileSync(
  "src/pages/communications/CommunicationsPage.tsx",
  "utf8",
);

const order = (() => {
  const start = SRC.indexOf("const TABS:");
  const block = SRC.slice(
    start,
    SRC.indexOf("];", start),
  );

  return [...block.matchAll(/id: "([a-z]+)"/g)].map(
    (match) => match[1],
  );
})();

describe("communications tab order", () => {
  it("reads Inbox, SMS, Messages, Team, Phone, Issues, Maya", () => {
    expect(order).toEqual([
      "inbox",
      "sms",
      "messages",
      "team",
      "phone",
      "issues",
      "maya",
    ]);
  });

  it("uses explicit tab, then valid URL tab, then Inbox fallback", () => {
    expect(SRC).toContain(
      'useState<Tab>(initialTab ?? validUrlTab ?? "inbox")',
    );

    expect(SRC).toContain(
      'const urlTab = initialParams.get("tab")',
    );

    expect(SRC).toContain(
      "TABS.some((candidate) => candidate.id === urlTab)",
    );

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
    expect(SRC).toContain(
      "Array.isArray(r?.shared) ? r.shared : []",
    );
  });
});
