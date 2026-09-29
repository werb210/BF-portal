// BF_PORTAL_CONTACT_DELETE_MESSAGE_v689
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("contact delete refused", () => {
  it("explains that a contact on an application can't be deleted", () => {
    const src = readFileSync("src/pages/crm/contacts/ContactsPage.tsx", "utf8");
    expect(src).toContain("This contact is on an application, so it can't be deleted.");
    expect(src).toContain("/409|fk_protected/i");
  });
});

describe("Settings -> Phone lines", () => {
  it("is an admin tab that saves each person's direct number", () => {
    const page = readFileSync("src/pages/settings/SettingsPage.tsx", "utf8");
    expect(page).toContain('{ id: "phone", label: "Phone lines", visible: isAdmin && !isBI, content: <PhoneLines /> }');
    const tab = readFileSync("src/pages/settings/tabs/PhoneLines.tsx", "utf8");
    expect(tab).toContain('api.put("/api/voice/direct-numbers/" + id, { direct_number: draft[id] ?? "" })');
  });
});

// BF_PORTAL_ADS_OPEN_IN_GOOGLE_v689b
describe("Maya's Google Ads recommendations", () => {
  it("open Google Ads instead of an Approve that the server refuses", () => {
    const s = readFileSync("src/pages/marketing/MarketingDashboard.tsx", "utf8");
    expect(s).toContain('data-testid="open-in-google-ads"');
    expect(s).toContain('"https://ads.google.com/aw/keywords"');
    expect(s).not.toContain('"/api/marketing/google-ads/suggestions/apply"');
  });
});
