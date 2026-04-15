import { describe, expect, it, vi, beforeEach } from "vitest";

import { checkBackend } from "@/bootstrap";
import { api, apiFetch, apiFetchWithRetry } from "@/api";
import { clearToken, setToken } from "@/auth/token";
import { useApiStatusStore } from "@/state/apiStatus";

describe("portal resilience", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    clearToken();
    useApiStatusStore.setState({ status: "starting" });
  });

  it("network failure retries and eventually succeeds", async () => {
    setToken("valid-token");
    globalThis.fetch = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Network down"))
      .mockResolvedValueOnce(new Response(null, { status: 502 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "ok", data: { ok: true } }), { status: 200 })) as typeof fetch;

    await expect(apiFetchWithRetry<{ ok: boolean }>("/api/health", { method: "GET" }, 2)).resolves.toEqual({
      ok: true,
    });
    expect(globalThis.fetch).toHaveBeenCalledTimes(3);
  });

  it("simulate API down -> UI health check fails fast", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError("Network down")) as typeof fetch;

    await expect(checkBackend()).resolves.toBe(false);
  });

  it("simulate timeout -> handled", async () => {
    setToken("valid-token");
    globalThis.fetch = vi.fn().mockRejectedValue(new DOMException("Aborted", "AbortError")) as typeof fetch;

    await expect(api("/api/health", { method: "GET" })).rejects.toThrow();
  });

  it("missing auth -> rejected", async () => {
    await expect(api("/api/protected", { method: "GET" })).rejects.toThrow("API_ERROR");
  });

  it("invalid response -> failure", async () => {
    setToken("valid-token");
    globalThis.fetch = vi.fn().mockResolvedValue(new Response("{not-json", { status: 200 })) as typeof fetch;
    await expect(api("/api/health", { method: "GET" })).rejects.toThrow();
  });

  it("success path -> clean data", async () => {
    setToken("valid-token");
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: "ok", data: { id: "a1", status: "ok" } }), { status: 200 }),
    ) as typeof fetch;

    await expect(apiFetch<{ id: string; status: string }>("/api/health", { method: "GET" })).resolves.toEqual({
      id: "a1",
      status: "ok",
    });
  });

  it("db not ready -> degraded mode result without crash", async () => {
    setToken("valid-token");
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: "error", error: "DB_NOT_READY" }), { status: 200 }),
    ) as typeof fetch;

    await expect(api<{ degraded: true }>("/api/health", { method: "GET" })).resolves.toEqual({ degraded: true });
    expect(useApiStatusStore.getState().status).toBe("degraded");
  });
});
