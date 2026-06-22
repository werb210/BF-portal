import { describe, it, expect } from "vitest";
import { signingBadgeView } from "../ApplicationTab";

describe("signingBadgeView", () => {
  it("maps 'signed' to a Signed label", () => {
    expect(signingBadgeView("signed").label).toBe("Signed");
  });
  it("maps 'started' to a Signing started label", () => {
    expect(signingBadgeView("started").label).toBe("Signing started");
  });
  it("maps 'ready' to a Ready to sign label", () => {
    expect(signingBadgeView("ready").label).toBe("Ready to sign");
  });
  it("maps 'not_started' to the fallback label", () => {
    expect(signingBadgeView("not_started").label).toBe("Sign: not started");
  });
  it("falls back to not-started for undefined/unknown status", () => {
    expect(signingBadgeView(undefined).label).toBe("Sign: not started");
    expect(signingBadgeView("garbage").label).toBe("Sign: not started");
  });
});
