import { beforeEach, describe, it, expect, vi } from "vitest";

describe("verifyOtp token extraction", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("auth_phone", "+15550001234");
  });

  it("extracts token from data.data.token (canonical server shape)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({ status: "ok", data: { token: "jwt-abc-123" } }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const { verifyOtp } = await import("@/auth/verify");
    const result = await verifyOtp("000000");
    expect(result.success).toBe(true);
    expect(localStorage.getItem("auth_token")).toBe("jwt-abc-123");
  });

  it("fails gracefully when no token in response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ status: "ok", data: {} }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const { verifyOtp } = await import("@/auth/verify");
    const result = await verifyOtp("000000");
    expect(result.success).toBe(false);
    expect(result.error).toContain("No token");
  });
});
