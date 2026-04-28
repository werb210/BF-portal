// @ts-nocheck
// BF_CREDIT_SUMMARY_UI_v46 — render contract test. Static checks on the file
// content keep the suite environment-agnostic (no react-dom, no providers).
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const editorPath = path.resolve(__dirname, "../CreditSummaryEditor.tsx");
const drawerPath = path.resolve(__dirname, "../../drawer/tab-credit-summary/CreditSummaryTab.tsx");
const detailPath = path.resolve(__dirname, "../../tabs/CreditSummaryTab.tsx");
const apiPath    = path.resolve(__dirname, "../../../../api/credit.ts");

describe("BF_CREDIT_SUMMARY_UI_v46 CreditSummaryEditor", () => {
  const editor = fs.readFileSync(editorPath, "utf8");

  it("renders all 6 sections", () => {
    for (const id of [
      "application-overview",
      "transaction-narrative",
      "business-overview-narrative",
      "financial-overview-narrative",
      "banking-analysis-narrative",
      "recommendation-narrative",
    ]) {
      expect(editor).toContain(`data-testid="${id}"`);
    }
  });

  it("exposes Regenerate, Save Draft, Submit buttons", () => {
    expect(editor).toContain('data-testid="regenerate-btn"');
    expect(editor).toContain('data-testid="save-draft-btn"');
    expect(editor).toContain('data-testid="submit-btn"');
  });

  it("does NOT render lock UI (ruling 10)", () => {
    expect(editor).not.toMatch(/[Ll]ock(ed)?\s*[Bb]utton/);
    expect(editor).not.toMatch(/setLocked|lockCreditSummary/);
    expect(editor).not.toMatch(/onClick=\{[^}]*lock/i);
  });
});

describe("BF_CREDIT_SUMMARY_UI_v46 shells", () => {
  it("drawer shell delegates to CreditSummaryEditor", () => {
    const drawer = fs.readFileSync(drawerPath, "utf8");
    expect(drawer).toContain("CreditSummaryEditor");
    expect(drawer).toContain("BF_CREDIT_SUMMARY_UI_v46");
  });

  it("detail-page shell takes applicationId prop and delegates to CreditSummaryEditor", () => {
    const detail = fs.readFileSync(detailPath, "utf8");
    expect(detail).toContain("CreditSummaryEditor");
    expect(detail).toContain("applicationId");
    expect(detail).not.toContain("AwaitingBackendPanel");
  });
});

describe("BF_CREDIT_SUMMARY_UI_v46 api/credit.ts", () => {
  const api = fs.readFileSync(apiPath, "utf8");

  it("targets the new /api/credit-summary endpoints (no /internal/ prefix)", () => {
    expect(api).not.toContain("/internal/application/");
    expect(api).toContain("/api/credit-summary/");
  });

  it("exports the new mutation helpers", () => {
    expect(api).toContain("saveCreditSummary");
    expect(api).toContain("regenerateCreditSummary");
    expect(api).toContain("submitCreditSummary");
  });
});
