import { describe, expect, it, vi, beforeEach } from "vitest";

import { checkBackend } from "@/bootstrap";
import { apiFetch } from "@/api/client";

describe("portal resilience", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("simulate API down -> UI health check fails fast", async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new TypeError("Network down")) as typeof fetch;

    await expect(checkBackend()).resolves.toBe(false);
  });

  it("simulate 500 -> error is surfaced", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ success: false, message: "boom" }), { status: 500 }),
    ) as typeof fetch;

    await expect(apiFetch("/api/health", { method: "GET" })).resolves.toEqual({
      success: false,
      message: "boom",
    });
  });

  it("simulate timeout -> no infinite loading", async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new DOMException("Aborted", "AbortError")) as typeof fetch;
    await expect(apiFetch("/api/health", { method: "GET" })).resolves.toEqual({
      success: false,
      message: "Network error",
    });
  });
});
