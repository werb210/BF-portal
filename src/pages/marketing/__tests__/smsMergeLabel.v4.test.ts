// BF_PORTAL_SMS_MERGE_LABEL_v4
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const src = readFileSync(path.join(process.cwd(), "src/pages/marketing/MarketingDashboard.tsx"), "utf8");

describe("sms composer merge hint", () => {
  it("no longer tells staff merge fields do not work", () => {
    expect(src).not.toContain("not applied to SMS");
  });
  it("names the fields the server actually substitutes", () => {
    expect(src).toContain("all work in SMS");
    expect(src).toContain('{"{{first_name}}"}');
  });
  it("keeps the tracked-link guidance", () => {
    expect(src).toContain("A tracked link is appended if you add a landing page below.");
  });
});
