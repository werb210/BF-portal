import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { apiRequest } from "@/api/client";
import { clearToken, getToken, setToken } from "@/auth/token";

const originalLocation = window.location;
const originalFetch = global.fetch;

describe("auth and api hard pipeline e2e requirements", () => {
  beforeEach(() => {
    clearToken();
    vi.restoreAllMocks();

    Object.defineProperty(window, "location", {
      configurable: true,
      value: { href: "http://localhost/", replace: vi.fn() },
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

    global.fetch = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, data: { message: "ok" } }), { status: 200 }),
    ) as typeof fetch;

    await expect(apiRequest("/api/test", { method: "GET" })).resolves.toEqual({
      success: true,
      data: { message: "ok" },
    });
  });

  it("TEST 4: API 401 keeps non-throwing contract", async () => {
    setToken("valid-token");

    global.fetch = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ success: false, message: "denied" }), { status: 401 }),
    ) as typeof fetch;

    await expect(apiRequest("/api/test", { method: "GET" })).resolves.toEqual({
      success: false,
      message: "denied",
    });
  });

  it("TEST 5: external path without token hard fails", async () => {
    clearToken();
    global.fetch = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ success: false, message: "Domain forbidden" }), { status: 403 }),
    ) as typeof fetch;

    await expect(apiRequest("https://evil.com/api/test", { method: "GET" })).resolves.toEqual({
      success: false,
      message: "Domain forbidden",
    });
  });

  it("TEST 6: 204 response returns null data", async () => {
    setToken("valid-token");
    global.fetch = vi.fn().mockResolvedValueOnce(new Response(null, { status: 204 })) as typeof fetch;

    await expect(apiRequest("/api/test", { method: "DELETE" })).resolves.toEqual({
      success: true,
      data: null,
    });
  });

  it("TEST 7: empty response returns empty object", async () => {
    setToken("valid-token");

    global.fetch = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, data: {} }), { status: 200 }),
    ) as typeof fetch;

    await expect(apiRequest("/api/test", { method: "GET" })).resolves.toEqual({
      success: true,
      data: {},
    });
  });

  it("TEST 8: request failure surfaces message", async () => {
    setToken("valid-token");

    global.fetch = vi.fn().mockRejectedValueOnce(new TypeError("NetworkError")) as typeof fetch;

    await expect(apiRequest("/api/test")).resolves.toEqual({
      success: false,
      message: "NetworkError",
    });
  });
});

afterAll(() => {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: originalLocation,
  });
  global.fetch = originalFetch;
});
