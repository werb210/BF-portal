// BF_PORTAL_MARKETING_ROLE_v1 - the portal auth layer must recognize the
// Marketing role, or AuthContext.resolveTokenUser returns null and the user is
// bounced to /login.
import { describe, it, expect } from "vitest";
import { normalizeRole } from "@/auth/roles";
describe("marketing role recognized by portal auth (v1)", () => {
  it("normalizeRole resolves Marketing", () => {
    expect(normalizeRole("Marketing")).toBe("Marketing");
    expect(normalizeRole("marketing")).toBe("Marketing");
  });
  it("still resolves the other staff roles", () => {
    expect(normalizeRole("Admin")).toBe("Admin");
    expect(normalizeRole("Staff")).toBe("Staff");
  });
});
