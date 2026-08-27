import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const tab = readFileSync(
  join(process.cwd(), "src", "pages", "applications", "tabs", "LendersTab.tsx"),
  "utf-8",
);

describe("BF_PORTAL_LENDER_PASS_REASON_v1", () => {
  it("only offers the field for lenders that received the package", () => {
    expect(tab).toContain("const isSent = Boolean(lenderKey && v_sentMap.has(lenderKey));");
    expect(tab).toContain("{isSent && (");
  });

  it("posts the reason to the recording endpoint", () => {
    expect(tab).toContain("/lender-response`");
    expect(tab).toContain("passMutation");
  });

  it("shows staff the same ordinal the client was given", () => {
    expect(tab).toContain("Lender ${recorded.ordinal} passed");
  });

  // BF_PORTAL_REJECTION_REASONS_v125 - the warning moved into the modal when the
  // free-text field became a checkbox catalogue.
  it("warns that the reasons reach the client", () => {
    const modal = readFileSync(
      join(process.cwd(), "src", "components", "applications", "RejectReasonsModal.tsx"),
      "utf-8",
    );
    expect(modal).toContain("The applicant sees these reasons on their portal.");
  });

  it("refreshes the recorded outcomes after a save", () => {
    expect(tab).toContain('queryKey: ["lender-responses", id]');
  });
});
