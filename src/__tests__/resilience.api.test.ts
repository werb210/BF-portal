import { describe, expect, it, vi, beforeEach } from "vitest";

import { checkBackend } from "@/bootstrap";
import { apiFetch } from "@/api/client";

describe("portal resilience", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("simulate API down -> UI health check fails fast", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new TypeError("Network down"));

    await expect(checkBackend()).resolves.toBe(false);
  });

  it("simulate 500 -> error is surfaced", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({ message: "boom" }), { status: 500 }));

    await expect(apiFetch("/api/health", { method: "GET" })).rejects.toThrow("API error 500");
  });

  it("simulate timeout -> no infinite loading", async () => {
    vi.useFakeTimers();

    vi.spyOn(globalThis, "fetch").mockImplementation((_, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
      }),
    );

    const request = apiFetch("/api/health", { method: "GET" });
    const pendingExpectation = expect(request).rejects.toThrow();

    await vi.advanceTimersByTimeAsync(8100);
    await pendingExpectation;

    vi.useRealTimers();
  });
});
