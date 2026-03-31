import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { apiRequest } from "@/lib/apiClient";
import { clearToken, getToken, setToken } from "@/services/token";

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

  it("TEST 4: API 401 clears token and redirects", async () => {
    setToken("valid-token");

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("denied", { status: 401 }));

    await expect(apiRequest("/api/test", { method: "GET" })).rejects.toThrow("UNAUTHORIZED");
    expect(getToken()).toBeNull();
    expect(window.location.replace).toHaveBeenCalledWith("/login");
  });

  it("TEST 5: non-/api path hard fails", async () => {
    setToken("valid-token");
    await expect(apiRequest("https://evil.com/api/test", { method: "GET" })).rejects.toThrow("INVALID_API_PATH");
  });

  it("TEST 6: 204 response returns null", async () => {
    setToken("valid-token");
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(apiRequest("/api/test", { method: "DELETE" })).resolves.toBeNull();
  });

  it("TEST 7: empty response throws", async () => {
    setToken("valid-token");

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("", { status: 200 }));

    await expect(apiRequest("/api/test", { method: "GET" })).rejects.toThrow("INVALID_RESPONSE");
  });

  it("TEST 8: retries transient failures", async () => {
    setToken("valid-token");

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
