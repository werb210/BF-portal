import { beforeEach, describe, expect, it, vi } from "vitest";

describe("verifyOtp error mapping", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("auth_phone", "+15878881837");
    vi.resetModules();
  });

  it("maps no_account to human-readable message", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({ status: "error", error: "no_account", message: "No staff account found..." }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      ),
    );

    const { verifyOtp } = await import("@/auth/verify");
    const result = await verifyOtp("287611");

    expect(result.success).toBe(false);
    expect(result.error).toContain("administrator");
    expect(result.error).not.toBe("no_account");
  });

  it("maps no_role to human-readable message", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ status: "error", error: "no_role" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const { verifyOtp } = await import("@/auth/verify");
    const result = await verifyOtp("123456");

    expect(result.success).toBe(false);
    expect(result.error).toContain("no role");
  });

  it("maps account_disabled to human-readable message", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ status: "error", error: "account_disabled" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const { verifyOtp } = await import("@/auth/verify");
    const result = await verifyOtp("123456");

    expect(result.success).toBe(false);
    expect(result.error).toContain("disabled");
  });

  it("still works for canonical success response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ status: "ok", data: { token: "eyJhbGci..." } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const { verifyOtp } = await import("@/auth/verify");
    const result = await verifyOtp("287611");

    expect(result.success).toBe(true);
    expect(localStorage.getItem("auth_token")).toBe("eyJhbGci...");
  });
});
