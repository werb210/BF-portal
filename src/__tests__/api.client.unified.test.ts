import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();

let api: (typeof import("@/api/index"))["api"];

beforeEach(async () => {
  vi.resetModules();
  mockFetch.mockReset();
  global.fetch = mockFetch as typeof fetch;
  localStorage.setItem("auth_token", "test-token");

  ({ api } = await import("@/api/index"));
});

describe("unified API client", () => {
  it("attaches Authorization header from storage", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "ok", data: { id: "1" } }),
    });

    await api.get("/api/test");

    const [, options] = mockFetch.mock.calls[0];
    expect((options.headers as Record<string, string>).Authorization).toBe("Bearer test-token");
  });

  it("throws on 401 responses", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ status: "error", error: "unauthorized" }),
    });

    await expect(api.get("/api/protected")).rejects.toThrow();
  });
});
