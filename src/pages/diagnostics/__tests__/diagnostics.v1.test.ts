import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const page = readFileSync("src/pages/diagnostics/DiagnosticsPage.tsx", "utf8");

describe("BF_PORTAL_DIAGNOSTICS_v1", () => {
  it("reads all five diagnostic endpoints", () => {
    expect(page).toContain("/marketing/ad-waste?days=");
    expect(page).toContain("/marketing/ad-keywords?days=");
    expect(page).toContain("/admin/job-queue");
    expect(page).toContain("/admin/submit-funnel?days=");
    expect(page).toContain("/admin/submit-failures?days=");
  });
  it("uses BF-Server routes without a v1 prefix", () => expect(page).not.toContain("/api/v1/"));
  it("surfaces wasted share and callable applicants", () => { expect(page).toContain("wastedShare"); expect(page).toContain("tel:${row.phone}"); });
  it("shows request errors", () => expect(page).toContain('data-testid="diag-error"'));
});
