import { describe, expect, it } from "vitest";

import { shouldLogoutOn401 } from "@/lib/apiAuth";

describe("shouldLogoutOn401", () => {
  it("logs out on 401 from /api/auth/me", () => {
    const out = shouldLogoutOn401("https://server.boreal.financial/api/auth/me");
    expect(out).toBe(true);
  });

  it("does NOT log out on 401 from /api/users/me/o365-status", () => {
    const out = shouldLogoutOn401("https://server.boreal.financial/api/users/me/o365-status");
    expect(out).toBe(false);
  });

  it("does NOT log out on 401 from arbitrary endpoints", () => {
    expect(shouldLogoutOn401("/api/calendar/events")).toBe(false);
    expect(shouldLogoutOn401("/api/portal/lenders")).toBe(false);
  });
});
