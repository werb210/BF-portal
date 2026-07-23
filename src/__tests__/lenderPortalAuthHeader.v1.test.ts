// BF_PORTAL_LENDER_PORTAL_AUTH_HEADER_v1
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { rawApiFetch } from "@/api";

describe("api client honours an explicitly supplied Authorization header", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("still refuses an authed path when nothing at all is supplied", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await expect(rawApiFetch("/api/lender/me")).rejects.toThrow("API_ERROR");
    // The point of the guard: no request should leave the browser.
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("sends the request when the caller supplies its own bearer token", async () => {
    // This is the lender portal's shape: no staff auth_token in localStorage,
    // its own token in sessionStorage, passed explicitly as a header.
    sessionStorage.setItem("lender_token", "lender-jwt");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ status: "ok", data: { id: "l1" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await rawApiFetch("/api/lender/me", {
      headers: { Authorization: "Bearer lender-jwt" },
    });

    expect(fetchSpy).toHaveBeenCalled();
  });

  it("matches the header case-insensitively", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ status: "ok", data: {} }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await rawApiFetch("/api/lender/me", {
      headers: { authorization: "Bearer lender-jwt" },
    });

    expect(fetchSpy).toHaveBeenCalled();
  });
});
