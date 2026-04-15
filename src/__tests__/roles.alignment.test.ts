import { describe, it, expect } from "vitest";
import { normalizeRole } from "@/auth/roles";

describe("role normalization", () => {
  it("normalizes Ops role", () => {
    expect(normalizeRole("Ops")).toBe("Ops");
    expect(normalizeRole("ops")).toBe("Ops");
  });

  it("returns null for unknown roles", () => {
    expect(normalizeRole("Marketing")).toBeNull();
    expect(normalizeRole("unknown")).toBeNull();
  });

  it("handles all canonical server roles", () => {
    const serverRoles = ["Admin", "Staff", "Ops", "Lender", "Referrer"];
    serverRoles.forEach((r) => {
      expect(normalizeRole(r)).not.toBeNull();
    });
  });
});
