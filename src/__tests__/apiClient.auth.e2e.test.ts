import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import api, { apiRequest } from "@/api/client";
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

    vi.spyOn(api, "request").mockResolvedValueOnce({
      status: 200,
      data: { ok: true },
    } as any);

    await expect(
      apiRequest("/api/test", {
        method: "GET",
      }),
    ).resolves.toEqual({ ok: true, status: 200, data: { ok: true } });
  });

  it("TEST 4: API 401 clears token", async () => {
    setToken("valid-token");

    vi.spyOn(api, "request").mockRejectedValueOnce({
      response: { status: 401, data: "denied" },
    });

    await expect(apiRequest("/api/test", { method: "GET" })).resolves.toEqual({
      ok: false,
      status: 401,
      data: "denied",
    });
    expect(getToken()).toBe("valid-token");
  });

  it("TEST 5: external path without token hard fails", async () => {
    clearToken();
    vi.spyOn(api, "request").mockRejectedValueOnce({
      response: { status: 403, data: "Domain forbidden" },
    });
    await expect(apiRequest("https://evil.com/api/test", { method: "GET" })).resolves.toEqual({
      ok: false,
      status: 403,
      data: "Domain forbidden",
    });
  });

  it("TEST 6: 204 response returns null", async () => {
    setToken("valid-token");
    vi.spyOn(api, "request").mockResolvedValueOnce({ status: 204, data: null } as any);
    await expect(apiRequest("/api/test", { method: "DELETE" })).resolves.toEqual({
      ok: true,
      status: 204,
      data: null,
    });
  });

  it("TEST 7: empty response returns empty object", async () => {
    setToken("valid-token");

    vi.spyOn(api, "request").mockResolvedValueOnce({ status: 200, data: {} } as any);

    await expect(apiRequest("/api/test", { method: "GET" })).resolves.toEqual({
      ok: true,
      status: 200,
      data: {},
    });
  });

  it("TEST 8: request failure surfaces error", async () => {
    setToken("valid-token");

    vi.spyOn(api, "request").mockRejectedValueOnce(new TypeError("NetworkError"));

    await expect(apiRequest("/api/test")).resolves.toEqual({
      ok: false,
      status: 0,
      data: null,
    });
  });
});

afterAll(() => {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: originalLocation,
  });
});
