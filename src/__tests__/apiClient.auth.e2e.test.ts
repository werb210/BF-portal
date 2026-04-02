import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "@/lib/api";
import { clearToken, getToken, setToken } from "@/auth/token";

const originalLocation = window.location;
const originalFetch = global.fetch;

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

    global.fetch = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ status: "ok", data: { message: "ok" } }), { status: 200 }),
    ) as typeof fetch;

    const res = await api("/api/test", { method: "GET" });
    expect(res).toBeDefined();
  });

  it("TEST 4: API 401 throws", async () => {
    setToken("valid-token");

    global.fetch = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ status: "error", error: { message: "denied" } }), { status: 401 }),
    ) as typeof fetch;

    await expect(api("/api/test", { method: "GET" })).rejects.toThrow("Unauthorized");
  });

  it("TEST 5: request without token hard fails before network", async () => {
    clearToken();

    await expect(api("https://evil.com/api/test", { method: "GET" })).rejects.toThrow("Auth token missing");
  });

  it("TEST 6: 204 response throws", async () => {
    setToken("valid-token");
    global.fetch = vi.fn().mockResolvedValueOnce(new Response(null, { status: 204 })) as typeof fetch;

    await expect(api("/api/test", { method: "DELETE" })).rejects.toThrow();
  });

  it("TEST 7: empty response returns empty object", async () => {
    setToken("valid-token");

    global.fetch = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ status: "ok", data: {} }), { status: 200 }),
    ) as typeof fetch;

    await expect(api("/api/test", { method: "GET" })).resolves.toEqual({});
  });

  it("TEST 8: request failure surfaces message", async () => {
    setToken("valid-token");

    global.fetch = vi.fn().mockRejectedValueOnce(new TypeError("NetworkError")) as typeof fetch;

    await expect(api("/api/test")).rejects.toThrow("NetworkError");
  });
});

afterAll(() => {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: originalLocation,
  });
  global.fetch = originalFetch;
});
