import { describe, expect, it } from "vitest";
import { fundedError } from "../CloseTab";

describe("marking a file funded", () => {
  it("explains a stage problem in plain words", () => {
    expect(fundedError("Invalid pipeline transition.")).toMatch(/not at the Accepted stage yet/);
  });
  it("keeps any other server message, and has a fallback", () => {
    expect(fundedError("Two funding conditions are still open.")).toBe("Two funding conditions are still open.");
    expect(fundedError("")).toMatch(/Clear or waive the open funding conditions/);
  });
});
