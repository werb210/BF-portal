import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { apiRequest } from "@/lib/apiClient";
import { getTokenOrFail, saveToken } from "@/services/token";

const originalLocation = window.location;

describe("auth and api hard pipeline e2e requirements", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();

    Object.defineProperty(window, "location", {
      configurable: true,
      value: { href: "http://localhost/" },
    });
  });

  it("TEST 1: no token fails startup contract", () => {
    expect(() => getTokenOrFail()).toThrow("[AUTH BLOCK] INVALID TOKEN");
  });

  it("TEST 2: valid token allows session access", () => {
    localStorage.setItem("token", "valid-token");
    expect(() => getTokenOrFail()).not.toThrow();
  });

  it("TEST 3: token value 'undefined' fails", () => {
    localStorage.setItem("token", "undefined");
    expect(() => getTokenOrFail()).toThrow("[AUTH BLOCK] INVALID TOKEN");
  });

  it("TEST 4: token value '' fails", () => {
    localStorage.setItem("token", "");
    expect(() => getTokenOrFail()).toThrow("[AUTH BLOCK] INVALID TOKEN");
  });

  it("TEST 5: token value 'null' fails", () => {
    localStorage.setItem("token", "null");
    expect(() => getTokenOrFail()).toThrow("[AUTH BLOCK] INVALID TOKEN");
  });

  it("TEST 6: saveToken blocks invalid writes", () => {
    expect(() => saveToken("undefined")).toThrow("[INVALID TOKEN WRITE]");
    expect(() => saveToken("")).toThrow("[INVALID TOKEN WRITE]");
    expect(() => saveToken("null")).toThrow("[INVALID TOKEN WRITE]");
  });

  it("TEST 7: authorization header override attempt is blocked", async () => {
    localStorage.setItem("token", "valid-token");

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

  it("TEST 8: credentials injection attempt is stripped", async () => {
    localStorage.setItem("token", "valid-token");

    vi.spyOn(globalThis, "fetch").mockImplementationOnce(async (_input, init) => {
      expect(init?.credentials).toBeUndefined();
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });

    await expect(apiRequest("/api/test", { method: "GET", credentials: "include" })).resolves.toEqual({ ok: true });
  });

  it("TEST 9: API 401 clears token and redirects", async () => {
    localStorage.setItem("token", "valid-token");

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("denied", { status: 401 }));

    await expect(apiRequest("/api/test", { method: "GET" })).rejects.toThrow("[401]");
    expect(localStorage.getItem("token")).toBeNull();
    expect(window.location.href).toBe("/login");
  });

  it("TEST 10: non-/api path hard fails", async () => {
    localStorage.setItem("token", "valid-token");
    await expect(apiRequest("https://evil.com/api/test", { method: "GET" })).rejects.toThrow("[INVALID PATH]");
  });

  it("TEST 11: empty response throws", async () => {
    localStorage.setItem("token", "valid-token");

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("", { status: 200 }));

    await expect(apiRequest("/api/test", { method: "GET" })).rejects.toThrow("[EMPTY]");
  });
});

afterAll(() => {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: originalLocation,
  });
});
