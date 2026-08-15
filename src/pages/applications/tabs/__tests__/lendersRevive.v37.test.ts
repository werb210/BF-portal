// BF_PORTAL_LENDERS_REVIVE_v37
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const src = readFileSync("src/pages/applications/tabs/LendersTab.tsx", "utf8");

describe("Reactivate on a parked file", () => {
  it("shows Reactivate instead of Hold and Fraud once parked", () => {
    // A parked file offers the way out, not the controls that put it there.
    expect(src).toContain("{isParked ? (");
    expect(src).toContain("void revive()");
  });

  it("names the stage the file will return to", () => {
    expect(src).toContain("`↺ Reactivate${previousStage ? ` to ${previousStage}` : \"\"}`");
  });

  it("reads the previous stage from the server rather than guessing", () => {
    // BF_SERVER_PARKED_DETAIL_v55 exposes this on the detail route.
    expect(src).toContain("appRecord?.application?.parkedPreviousStage");
  });

  it("falls back to In Review only when the server has no record", () => {
    expect(src).toContain('const back = previousStage || "In Review";');
  });

  it("confirms before reactivating", () => {
    expect(src).toContain("Reactivate this application and return it to");
  });

  it("records where the file was reactivated from", () => {
    expect(src).toContain("reason: `Reactivated from ${currentStage ?? \"parked\"}`");
  });

  it("surfaces a failure instead of silently doing nothing", () => {
    expect(src).toContain("Unable to reactivate this application.");
  });
});

describe("why the file is parked", () => {
  it("shows the reason on the tab", () => {
    // The reason travels with the file, so whoever reactivates it can see why
    // it was parked in the first place.
    expect(src).toContain('{parkedReason || "No reason recorded."}');
  });

  it("says plainly that a fraud file cannot be sent to a lender", () => {
    expect(src).toContain("This file cannot be sent to a lender.");
  });

  it("only treats Fraud and Hold as parked", () => {
    expect(src).toContain('const isParked = currentStage === "Fraud" || currentStage === "Hold";');
  });
});

describe("the v36 controls are unchanged for a working file", () => {
  it("still offers Hold and Fraud when not parked", () => {
    expect(src).toContain('void park("Hold")');
    expect(src).toContain('void park("Fraud")');
  });

  it("still requires a reason for fraud", () => {
    expect(src).toContain("A reason is required to mark an application as fraud.");
  });
});
