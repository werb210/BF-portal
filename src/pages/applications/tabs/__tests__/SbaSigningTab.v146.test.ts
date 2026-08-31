// BF_PORTAL_SBA_SIGNING_TAB_v146
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const tab = readFileSync(resolve(__dirname, "..", "SbaSigningTab.tsx"), "utf-8");
const detail = readFileSync(resolve(__dirname, "..", "..", "..", "application", "ApplicationDetail.tsx"), "utf-8");

describe("the endpoints finally have a caller", () => {
  it("reads the status endpoint", () => expect(tab).toContain("/sba-signing`"));
  it("can resend", () => expect(tab).toContain("/sba-signing/resend`"));
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

describe("resend is guarded and honest", () => {
  it("is disabled until forms are complete", () => {
    expect(tab).toContain("disabled={busy || !data.formsComplete}");
    expect(tab).toContain("Available once the applicant has submitted every SBA form.");
  });
  it("says the links expire", () => expect(tab).toContain("expire in 45 minutes"));
  it("reports owners with links", () => expect(tab).toContain("links.filter((l: any) => l?.url).length"));
});

describe("a non-SBA application says so plainly", () => {
  it("does not render an empty signing panel", () => expect(tab).toContain("Not an SBA application"));
});
