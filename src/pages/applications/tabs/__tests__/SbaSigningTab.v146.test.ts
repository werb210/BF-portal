// BF_PORTAL_SBA_SIGNING_TAB_v146
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const tab = readFileSync(resolve(__dirname, "..", "SbaSigningTab.tsx"), "utf-8");
const detail = readFileSync(resolve(__dirname, "..", "..", "..", "application", "ApplicationDetail.tsx"), "utf-8");

describe("the endpoints finally have a caller", () => {
  it("reads the status endpoint", () => expect(tab).toContain("/sba-signing`"));
  it("is registered as a tab", () => {
    expect(detail).toContain('{ key: "sba-signing", label: "SBA Signing" }');
    expect(detail).toContain('"sba-signing": <SbaSigningTab applicationId={applicationId} />');
  });
});

describe("it shows staff what is actually blocking", () => {
  it("separates forms-complete from all-signed", () => {
    expect(tab).toContain('data-testid="sba-forms-complete"');
    expect(tab).toContain('data-testid="sba-all-signed"');
  });
  it("names outstanding forms", () => expect(tab).toContain('data-testid="sba-missing-forms"'));
  it("flags an envelope with no 4506-C", () => {
    expect(tab).toContain("sba-no-4506c-");
    expect(tab).toContain("Set the IVES participant fields on the selected lender");
  });
});

// BF_PORTAL_SBA_ONE_BUTTON_v771 - the tab's own resend was removed (it dropped the application from the
// signing). Signing starts from Send on the Lenders tab or Send for signing on the Application tab.
describe("the tab no longer starts signing itself", () => {
  it("has no resend or send call", () => {
    expect(tab).not.toContain("/sba-signing/resend`");
    expect(tab).not.toContain("/sba-signing/send`");
    expect(tab).toContain('data-testid="sba-how-to-sign"');
  });
});

describe("a non-SBA application says so plainly", () => {
  it("does not render an empty signing panel", () => expect(tab).toContain("Not an SBA application"));
});
