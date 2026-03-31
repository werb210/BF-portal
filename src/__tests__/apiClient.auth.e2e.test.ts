import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { apiRequest } from "@/lib/api";
import { clearToken, getToken, setToken } from "@/auth/token";

const originalLocation = window.location;

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

    vi.spyOn(globalThis, "fetch").mockImplementationOnce(async (_input, init) => {
      const headers = new Headers(init?.headers);
      expect(headers.get("Authorization")).toBe("Bearer valid-token");
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });

    await expect(
      apiRequest("/api/test", {
        method: "GET",
        headers: { Authorization: "Bearer injected" },
      }),
    ).resolves.toEqual({ ok: true });
  });

  it("TEST 4: API 401 clears token", async () => {
    setToken("valid-token");

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("denied", { status: 401 }));

    await expect(apiRequest("/api/test", { method: "GET" })).rejects.toThrow("INVALID_TOKEN");
    expect(getToken()).toBeNull();
  });

  it("TEST 5: external path without token hard fails", async () => {
    clearToken();
    await expect(apiRequest("https://evil.com/api/test", { method: "GET" })).rejects.toThrow("AUTH_REQUIRED");
  });

  it("TEST 6: 204 response returns null", async () => {
    setToken("valid-token");
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(apiRequest("/api/test", { method: "DELETE" })).resolves.toBeNull();
  });

  it("TEST 7: empty response returns empty object", async () => {
    setToken("valid-token");

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("", { status: 200 }));

    await expect(apiRequest("/api/test", { method: "GET" })).resolves.toEqual({});
  });

  it("TEST 8: request failure surfaces error", async () => {
    setToken("valid-token");

    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new TypeError("NetworkError"));

    await expect(apiRequest("/api/test")).rejects.toThrow("NetworkError");
  });
});

afterAll(() => {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: originalLocation,
  });
});
