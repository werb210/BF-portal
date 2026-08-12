// BF_PORTAL_BANKING_RERUN_v33
/// <reference types="node" />
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const src = readFileSync("src/pages/applications/tabs/BankingAnalysisTab.tsx", "utf8");

describe("re-run analysis control", () => {
  it("offers a re-run button outside the failed-only branch", () => {
    // The old retry lived inside `if (status === "failed")`, so a completed but
    // wrong analysis had no way back - and the worker skips analysis_complete.
    const failedBranch = src.indexOf('=== "failed"');
    const button = src.indexOf('data-testid="banking-rerun"');
    expect(button).toBeGreaterThan(-1);
    expect(button).toBeGreaterThan(failedBranch);
    expect(src.slice(failedBranch, src.indexOf("return (", failedBranch))).not.toContain("banking-rerun");
  });

  it("posts to the retry endpoint that resets the row to pending", () => {
    expect(src).toContain('"/api/applications/" + applicationId + "/banking-analysis/retry"');
  });

  it("disables the button while a run is queued", () => {
    expect(src).toContain("disabled={rerunning}");
  });
});
