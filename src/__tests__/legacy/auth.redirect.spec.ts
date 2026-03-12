import { describe, expect, it } from "vitest";
import { resolvePostLoginDestination } from "@/pages/login/LoginPage";

describe("auth redirect guards", () => {
  it("routes lender users to /lenders", () => {
    expect(resolvePostLoginDestination("Lender")).toBe("/lenders");
  });

  it("routes admin users to the admin route", () => {
    expect(resolvePostLoginDestination("Admin")).toBe("/admin/ai");
  });

  it("rejects unknown roles", () => {
    expect(resolvePostLoginDestination("Unknown")).toBe("/unauthorized");
  });
});
