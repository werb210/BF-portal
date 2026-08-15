// BF_PORTAL_LENDERS_PARK_v36
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const src = readFileSync("src/pages/applications/tabs/LendersTab.tsx", "utf8");

describe("Hold and Fraud on the Lenders tab", () => {
  it("puts both controls beside the heading", () => {
    // Fraud is usually spotted while reading the lender matches; having to go
    // back to the board to act on it invites forgetting.
    const head = src.slice(src.indexOf("styles.headRow"), src.indexOf("{parkError &&"));
    expect(head).toContain('void park("Hold")');
    expect(head).toContain('void park("Fraud")');
  });

  it("keeps the heading and match count in the same row", () => {
    const head = src.slice(src.indexOf("styles.headRow"), src.indexOf("{parkError &&"));
    expect(head).toContain("<h2 style={styles.header}>Lenders</h2>");
    expect(head).toContain("last computed");
  });

  it("hides the controls from users who cannot write", () => {
    expect(src).toContain("{canManage && (");
  });
});

describe("the same guardrails as the pipeline board", () => {
  it("asks for a reason before parking", () => {
    expect(src).toContain("const entered = window.prompt(prompt");
  });

  it("refuses to mark fraud without a reason", () => {
    expect(src).toContain("A reason is required to mark an application as fraud.");
  });

  it("aborts cleanly when the prompt is cancelled", () => {
    expect(src).toContain("if (entered === null) return;");
  });

  it("warns that a fraud file can no longer be sent to a lender", () => {
    // Relevant here specifically: this tab is where lender submission happens.
    expect(src).toContain("can no longer be sent to a lender");
  });

  it("uses the same status endpoint as the board", () => {
    expect(src).toContain("`/api/portal/applications/${id}/status`");
  });

  it("surfaces a failure instead of silently doing nothing", () => {
    expect(src).toContain("setParkError(getErrorMessage(e,");
  });

  it("returns to the pipeline once parked", () => {
    // Deliberately not useNavigate - this tab renders outside a Router in its
    // existing tests and that dependency broke eleven of them.
    expect(src).toContain('window.location.assign("/pipeline")');
    expect(src).not.toContain('from "react-router-dom"');
  });
});
