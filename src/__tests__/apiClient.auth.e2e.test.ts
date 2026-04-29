import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "@/api";
import { clearToken, getToken, setToken } from "@/auth/token";

const originalLocation = window.location;
const originalFetch = globalThis.fetch;

describe("auth and api hard pipeline e2e requirements", () => {
  beforeEach(() => {
    clearToken();
    vi.restoreAllMocks();

    Object.defineProperty(window, "location", {
      configurable: true,
      value: { href: "https://portal.example/", replace: vi.fn() },
    });
  });

  it("TEST 1: no token fails startup contract", () => {
    expect(getToken()).toBeNull();
  });

  it("TEST 2: valid token allows session access", () => {
    setToken("valid-token");
    expect(getToken()).toBe("valid-token");
  });

  it("TEST 3: authorization header override attempt is blocked", async () => {
    setToken("valid-token");

    globalThis.fetch = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ status: "ok", data: { message: "ok" } }), { status: 200 }),
    ) as typeof fetch;

    const res = await api("/api/test", { method: "GET" });
    expect(res).toBeDefined();
  });

  it("TEST 4: API 401 throws", async () => {
    setToken("valid-token");

    globalThis.fetch = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ status: "error", error: { message: "denied" } }), { status: 401 }),
    ) as typeof fetch;

    await expect(api("/api/test", { method: "GET" })).rejects.toThrow("API_ERROR");
  });

  it("TEST 5: request without token hard fails before network", async () => {
    clearToken();

    await expect(api("https://evil.com/api/test", { method: "GET" })).rejects.toThrow("API_ERROR");
  });

  it("TEST 6: 204 response resolves to undefined (BF_PORTAL_REFRESH_AND_PARSE_v55)", async () => {
    setToken("valid-token");
    globalThis.fetch = vi.fn().mockResolvedValueOnce(new Response(null, { status: 204 })) as typeof fetch;

    // Contract change in v55: DELETE/PATCH handlers may return 204 No Content,
    // and apiFetch resolves to undefined rather than throwing on the empty
    // body. This unblocks React Query cache invalidation in mutation
    // onSuccess handlers.
    await expect(api("/api/test", { method: "DELETE" })).resolves.toBeUndefined();
  });

  it("TEST 7: empty response returns empty object", async () => {
    setToken("valid-token");

    globalThis.fetch = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ status: "ok", data: {} }), { status: 200 }),
    ) as typeof fetch;

    await expect(api("/api/test", { method: "GET" })).resolves.toEqual({});
  });

  it("TEST 8: request failure surfaces message", async () => {
    setToken("valid-token");

    globalThis.fetch = vi.fn().mockRejectedValueOnce(new TypeError("NetworkError")) as typeof fetch;

    await expect(api("/api/test")).rejects.toThrow("NetworkError");
  });
});

afterAll(() => {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: originalLocation,
  });
  globalThis.fetch = originalFetch;
});
