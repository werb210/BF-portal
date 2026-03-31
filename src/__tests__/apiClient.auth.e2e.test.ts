import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { apiRequest } from "@/lib/apiClient";
import { enforceSession } from "@/auth/sessionGuard";

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

  it("TEST 1: no token redirects to login", () => {
    expect(() => enforceSession()).toThrow("[SESSION BLOCKED]");
    expect(window.location.href).toBe("/login");
  });

  it("TEST 2: valid token allows app/session access", () => {
    localStorage.setItem("token", "valid-token");
    expect(() => enforceSession()).not.toThrow();
  });

  it("TEST 3: API success returns data", async () => {
    localStorage.setItem("token", "valid-token");

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true, data: [1, 2, 3] }), { status: 200 })
    );

    await expect(apiRequest("/api/test", { method: "GET" })).resolves.toEqual({ ok: true, data: [1, 2, 3] });
  });

  it("TEST 4: API 401 clears token and redirects", async () => {
    localStorage.setItem("token", "valid-token");

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("denied", { status: 401 }));

    await expect(apiRequest("/api/test", { method: "GET" })).rejects.toThrow("[AUTH FAIL]");
    expect(localStorage.getItem("token")).toBeNull();
    expect(window.location.href).toBe("/login");
  });

  it("TEST 5: invalid path is blocked", async () => {
    localStorage.setItem("token", "valid-token");
    await expect(apiRequest("https://evil.example/api/test", { method: "GET" })).rejects.toThrow("[INVALID API FORMAT]");
  });

  it("TEST 6: empty response throws", async () => {
    localStorage.setItem("token", "valid-token");

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("", { status: 200 }));

    await expect(apiRequest("/api/test", { method: "GET" })).rejects.toThrow("[EMPTY RESPONSE]");
  });
});

afterAll(() => {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: originalLocation,
  });
});
