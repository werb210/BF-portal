// BF_PORTAL_NOTIFY_CONTACT_v627
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { notifyOutcome } from "../NotifyContactButton";

describe("v627 notify outcome wording", () => {
  it("says which channel was used", () => {
    expect(notifyOutcome({ ok: true, channel: "app" })).toMatch(/Boreal app/);
    expect(notifyOutcome({ ok: true, channel: "sms" })).toMatch(/text message/);
    expect(notifyOutcome({ ok: true, channel: "bi" })).toMatch(/Boreal Risk/);
    expect(notifyOutcome({ ok: false, channel: "none", error: "no_phone" })).toMatch(/no mobile number/);
  });
});

describe("v627 contact page", () => {
  it("shows Notify next to Delete and posts to the notify route", () => {
    const page = readFileSync(path.join(process.cwd(), "src/pages/crm/contacts/ContactDetailPage.tsx"), "utf8");
    expect(page).toContain("<NotifyContactButton contactId={id}");
    const btn = readFileSync(path.join(process.cwd(), "src/components/crm/NotifyContactButton.tsx"), "utf8");
    expect(btn).toContain("/api/crm/contacts/");
    expect(btn).toContain("/notify");
  });
});
