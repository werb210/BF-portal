import { describe, expect, it, vi, beforeEach } from "vitest";

import { checkBackend } from "@/bootstrap";
import api, { apiFetch } from "@/api/client";

describe("portal resilience", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("simulate API down -> UI health check fails fast", async () => {
    vi.spyOn(api, "request").mockRejectedValueOnce(new TypeError("Network down"));

    await expect(checkBackend()).resolves.toBe(false);
  });

  it("simulate 500 -> error is surfaced", async () => {
    vi.spyOn(api, "request").mockRejectedValueOnce({
      response: { status: 500, data: { message: "boom" } },
    });

    await expect(apiFetch("/api/health", { method: "GET" })).resolves.toEqual({
      ok: false,
      status: 500,
      data: { message: "boom" },
    });
  });

  it("simulate timeout -> no infinite loading", async () => {
    vi.spyOn(api, "request").mockRejectedValueOnce(new DOMException("Aborted", "AbortError"));
    await expect(apiFetch("/api/health", { method: "GET" })).resolves.toEqual({
      ok: false,
      status: 0,
      data: null,
    });
  });
});
