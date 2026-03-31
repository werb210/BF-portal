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
    expect(() => saveToken("undefined")).toThrow("[INVALID TOKEN]");
    expect(() => saveToken("")).toThrow("[INVALID TOKEN]");
    expect(() => saveToken("null")).toThrow("[INVALID TOKEN]");
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

    await expect(apiRequest("/api/test", { method: "GET" })).rejects.toThrow("UNAUTHORIZED");
    expect(localStorage.getItem("token")).toBeNull();
    expect(window.location.href).toBe("/login");
  });

  it("TEST 10: non-/api path hard fails", async () => {
    localStorage.setItem("token", "valid-token");
    await expect(apiRequest("https://evil.com/api/test", { method: "GET" })).rejects.toThrow("[INVALID PATH]");
  });

  it("TEST 10B: malformed /api path hard fails", async () => {
    localStorage.setItem("token", "valid-token");
    await expect(apiRequest("/api/test?inject=true", { method: "GET" })).rejects.toThrow();
  });

  it("TEST 10C: 204 response returns null", async () => {
    localStorage.setItem("token", "valid-token");
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(apiRequest("/api/test", { method: "DELETE" })).resolves.toBeNull();
  });

  it("TEST 11: empty response throws", async () => {
    localStorage.setItem("token", "valid-token");

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("", { status: 200 }));

    await expect(apiRequest("/api/test", { method: "GET" })).rejects.toThrow("INVALID_RESPONSE");
  });


  it("TEST 12: fails after timeout", async () => {
    localStorage.setItem("token", "valid-token");

    vi.spyOn(globalThis, "fetch").mockImplementationOnce((_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      }),
    );

    await expect(apiRequest("/api/slow-endpoint", { timeout: 1 })).rejects.toThrow();
  });

  it("TEST 13: retries transient failures", async () => {
    localStorage.setItem("token", "valid-token");

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new TypeError("NetworkError"))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    const res = await apiRequest("/api/test");

    expect(res).toBeDefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

afterAll(() => {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: originalLocation,
  });
});
