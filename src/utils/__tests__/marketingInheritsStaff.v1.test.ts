// BF_PORTAL_MARKETING_INHERITS_STAFF_v1 - Marketing = Staff access + Marketing tab.
import { describe, it, expect } from "vitest";
import { canAccess } from "@/utils/permissions";
const access = (role: any, allowedRoles: any) => canAccess({ role, allowedRoles });
describe("marketing inherits staff access (v1)", () => {
  it("Marketing reaches Staff-allowed pages", () => {
    expect(access("Marketing", ["Admin", "Staff"])).toBe(true);
  });
  it("Marketing reaches Marketing tab; Staff cannot", () => {
    expect(access("Marketing", ["Admin", "Marketing"])).toBe(true);
    expect(access("Staff", ["Admin", "Marketing"])).toBe(false);
  });
  it("Admin-only stays Admin-only", () => {
    expect(access("Marketing", ["Admin"])).toBe(false);
    expect(access("Admin", ["Admin"])).toBe(true);
  });
});
