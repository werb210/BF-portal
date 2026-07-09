import { describe, it, expect } from "vitest";
import { normalizeRole } from "@/auth/roles";

describe("role normalization", () => {
  it("normalizes Ops role", () => {
    expect(normalizeRole("Ops")).toBe("Ops");
    expect(normalizeRole("ops")).toBe("Ops");
  });

  it("recognizes the Marketing role (server issues Marketing tokens)", () => {
    expect(normalizeRole("Marketing")).toBe("Marketing");
    expect(normalizeRole("marketing")).toBe("Marketing");
  });

  it("returns null for genuinely unknown roles", () => {
    expect(normalizeRole("Superuser")).toBeNull();
    expect(normalizeRole("unknown")).toBeNull();
  });

  it("handles all canonical server roles", () => {
    const serverRoles = ["Admin", "Staff", "Marketing", "Ops", "Lender", "Referrer"];
    serverRoles.forEach((r) => {
      expect(normalizeRole(r)).not.toBeNull();
    });
  });
});
