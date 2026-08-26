// BF_PORTAL_HOLD_REASON_REQUIRED_v203
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const lenders = readFileSync(resolve(__dirname, "..", "LendersTab.tsx"), "utf-8");
const pipeline = readFileSync(
  resolve(__dirname, "..", "..", "..", "pipeline", "PipelinePage.tsx"),
  "utf-8",
);

describe.each([["LendersTab", lenders], ["PipelinePage", pipeline]])("%s", (_n, src) => {
  it("no longer calls the hold reason optional", () => {
    expect(src).not.toContain("Reason (optional):");
    expect(src).toContain("Reason (required):");
  });
  it("tells staff the client will read it", () => {
    expect(src).toContain("emailed this reason from submissions@");
  });
  it("blocks a blank hold reason before the request", () => {
    expect(src).toContain("A reason is required to put an application on hold");
  });
  it("leaves the fraud guard alone", () => {
    expect(src).toContain("A reason is required to mark an application as fraud.");
  });
});

describe("variable naming", () => {
  it("LendersTab guards on stage/reason", () => {
    expect(lenders).toContain('stage === "Hold" && reason.length < 3');
  });
  it("PipelinePage guards on toStage/trimmed", () => {
    expect(pipeline).toContain('toStage === "Hold" && trimmed.length < 3');
  });
});
