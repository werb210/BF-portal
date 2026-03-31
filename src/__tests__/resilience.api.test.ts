import { describe, expect, it, vi, beforeEach } from "vitest";

import { checkBackend } from "@/bootstrap";
import { apiFetch } from "@/api/client";
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
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: { ok: true } }), { status: 200 })) as typeof fetch;

    await expect(apiFetch<{ ok: boolean }>("/api/health", { method: "GET" })).resolves.toEqual({
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

    await expect(apiFetch("/api/health", { method: "GET" })).resolves.toEqual({
      success: false,
      message: "timeout",
    });
  });

  it("missing auth -> rejected", async () => {
    await expect(apiFetch("/api/protected", { method: "GET" })).resolves.toEqual({
      success: false,
      message: "missing auth",
    });
  });

  it("invalid response -> failure", async () => {
    setToken("valid-token");
    global.fetch = vi.fn().mockResolvedValue(new Response("{not-json", { status: 200 })) as typeof fetch;
    await expect(apiFetch("/api/health", { method: "GET" })).resolves.toEqual({
      success: false,
      message: "invalid response",
    });
  });

  it("success path -> clean data", async () => {
    setToken("valid-token");
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "a1", status: "ok" }), { status: 200 }),
    ) as typeof fetch;

    await expect(apiFetch<{ id: string; status: string }>("/api/health", { method: "GET" })).resolves.toEqual({
      success: true,
      data: { id: "a1", status: "ok" },
    });
  });
});
