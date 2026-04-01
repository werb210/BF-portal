import { describe, expect, it, vi, beforeEach } from "vitest";

import { checkBackend } from "@/bootstrap";
import { apiClient, apiFetch, apiFetchWithRetry } from "@/lib/apiClient";
import { clearToken, setToken } from "@/auth/token";

describe("portal resilience", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    clearToken();
  });

  it("network failure retries and then succeeds", async () => {
    setToken("valid-token");
    global.fetch = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Network down"))
      .mockResolvedValueOnce(new Response(null, { status: 502 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "ok", data: { ok: true } }), { status: 200 })) as typeof fetch;

    await expect(apiFetchWithRetry<{ ok: boolean }>("/api/health", { method: "GET" }, 2)).resolves.toEqual({
      success: true,
      data: { ok: true },
    });
  });

  it("simulate API down -> UI health check fails fast", async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError("Network down")) as typeof fetch;

    await expect(checkBackend()).resolves.toBe(false);
  });

  it("simulate timeout -> handled", async () => {
    setToken("valid-token");
    global.fetch = vi.fn().mockRejectedValue(new DOMException("Aborted", "AbortError")) as typeof fetch;

    await expect(apiClient("/api/health", { method: "GET" })).rejects.toThrow();
  });

  it("missing auth -> rejected", async () => {
    await expect(apiClient("/api/protected", { method: "GET" })).rejects.toThrow("MISSING_AUTH");
  });

  it("invalid response -> failure", async () => {
    setToken("valid-token");
    global.fetch = vi.fn().mockResolvedValue(new Response("{not-json", { status: 200 })) as typeof fetch;
    await expect(apiClient("/api/health", { method: "GET" })).rejects.toThrow();
  });

  it("success path -> clean data", async () => {
    setToken("valid-token");
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: "ok", data: { id: "a1", status: "ok" } }), { status: 200 }),
    ) as typeof fetch;

    await expect(apiFetch<{ id: string; status: string }>("/api/health", { method: "GET" })).resolves.toEqual({
      success: true,
      data: { id: "a1", status: "ok" },
    });
  });
});
