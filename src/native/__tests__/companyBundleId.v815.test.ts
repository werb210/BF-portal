// BF_PORTAL_v815_COMPANY_BUNDLE_ID - the iPad portal ships from the company Apple account as com.borealfinancial.portal
// (com.boreal.portal belongs to another Apple account); the widget, share extension and app group follow.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const pbx = readFileSync("ios/App/App.xcodeproj/project.pbxproj", "utf8");

describe("iPad portal uses the company bundle IDs", () => {
  it("app, widget and share extension use com.borealfinancial.portal", () => {
    expect(pbx).toMatch(/PRODUCT_BUNDLE_IDENTIFIER = com\.borealfinancial\.portal;/);
    expect(pbx).toContain("PRODUCT_BUNDLE_IDENTIFIER = com.borealfinancial.portal.widget;");
    expect(pbx).toContain("PRODUCT_BUNDLE_IDENTIFIER = com.borealfinancial.portal.share;");
    expect(pbx).not.toMatch(/PRODUCT_BUNDLE_IDENTIFIER = com\.boreal\.portal[;.]/);
  });
  it("all three entitlements share the new app group", () => {
    for (const f of ["ios/App/App/App.entitlements", "ios/App/BorealShare/BorealShare.entitlements", "ios/App/BorealWidget/BorealWidget.entitlements"]) {
      const s = readFileSync(f, "utf8");
      expect(s, f).toContain("<string>group.com.borealfinancial.portal</string>");
      expect(s, f).not.toContain("group.com.boreal.portal<");
    }
  });
});
