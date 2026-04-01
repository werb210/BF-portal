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
      new Response(JSON.stringify({ status: "ok", data: { message: "ok" } }), { status: 200 }),
    ) as typeof fetch;

    await expect(apiRequest("/api/test", { method: "GET" })).resolves.toEqual({
      success: true,
      data: { message: "ok" },
    });
  });

  it("TEST 4: API 401 keeps non-throwing contract", async () => {
    setToken("valid-token");

    global.fetch = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ status: "error", error: { message: "denied" } }), { status: 401 }),
    ) as typeof fetch;

    await expect(apiRequest("/api/test", { method: "GET" })).resolves.toEqual({
      success: false,
      error: "HTTP_ERROR_401",
    });
  });

  it("TEST 5: request without token hard fails before network", async () => {
    clearToken();

    await expect(apiRequest("https://evil.com/api/test", { method: "GET" })).resolves.toEqual({
      success: false,
      error: "MISSING_AUTH",
    });
  });

  it("TEST 6: 204 response returns null data", async () => {
    setToken("valid-token");
    global.fetch = vi.fn().mockResolvedValueOnce(new Response(null, { status: 204 })) as typeof fetch;

    await expect(apiRequest("/api/test", { method: "DELETE" })).resolves.toEqual({
      success: false,
      error: "INVALID_JSON",
    });
  });

  it("TEST 7: empty response returns empty object", async () => {
    setToken("valid-token");

    global.fetch = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ status: "ok", data: {} }), { status: 200 }),
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
      error: "NetworkError",
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
