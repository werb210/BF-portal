import { describe, expect, it } from "vitest";
import { formatMoneyOrRange } from "./moneyRange";

describe("formatMoneyOrRange", () => {
  it("passes range strings through verbatim (no concatenation)", () => {
    expect(formatMoneyOrRange("$500,001 to $1,000,000")).toBe("$500,001 to $1,000,000");
    expect(formatMoneyOrRange("$50,000 to $100,000")).toBe("$50,000 to $100,000");
    expect(formatMoneyOrRange("$100,001 to $250,000")).toBe("$100,001 to $250,000");
    expect(formatMoneyOrRange("$1,000,000 or more")).toBe("$1,000,000 or more");
  });
  it("formats scalar values as currency", () => {
    expect(formatMoneyOrRange(20000)).toBe("$20,000");
    expect(formatMoneyOrRange("20000")).toBe("$20,000");
    expect(formatMoneyOrRange("$1,000,000")).toBe("$1,000,000");
  });
  it("returns the fallback for empty / non-positive", () => {
    expect(formatMoneyOrRange("")).toBe("—");
    expect(formatMoneyOrRange(0)).toBe("—");
    expect(formatMoneyOrRange(null)).toBe("—");
  });
});
