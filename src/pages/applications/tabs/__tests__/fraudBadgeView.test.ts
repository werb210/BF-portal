import { describe, it, expect } from "vitest";
import { fraudBadgeView } from "../DocumentsTab";

describe("fraudBadgeView", () => {
  it("maps high to a High risk badge", () => {
    expect(fraudBadgeView("high").label).toBe("High risk");
  });

  it("maps medium to Review", () => {
    expect(fraudBadgeView("medium").label).toBe("Review");
  });

  it("maps low to Low", () => {
    expect(fraudBadgeView("low").label).toBe("Low");
  });

  it("maps clean to No tamper signals", () => {
    expect(fraudBadgeView("clean").label).toBe("No tamper signals");
  });

  it("falls back to a neutral Scan badge for unknown/undefined", () => {
    expect(fraudBadgeView(undefined).label).toBe("Scan");
    expect(fraudBadgeView("garbage").label).toBe("Scan");
  });
});
