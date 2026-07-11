// BF_PORTAL_REFERRER_PORTAL_V2
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
const s = readFileSync(path.join(process.cwd(), "src/pages/referrer/ReferrerPortal.tsx"), "utf8");
describe("referrer portal v2", () => {
  it("has the three refer-to options incl start-up", () => {
    expect(s).toContain('label="Funding"');
    expect(s).toContain('label="Personal Guarantee Insurance"');
    expect(s).toContain('label="Start-up funding"');
  });
  it("shows message previews + Save & add another + phone formatting + startup flag", () => {
    expect(s).toContain("MSG_PREVIEW");
    expect(s).toContain("Save &amp; add another");
    expect(s).toContain("function formatPhone");
    expect(s).toContain("startup: refer.startup");
  });
});
