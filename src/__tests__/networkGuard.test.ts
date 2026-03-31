import { describe, expect, it, vi } from "vitest";

describe("network guard", () => {
  it("blocks direct fetch outside api client", async () => {
    const originalFetch = window.fetch;
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    window.fetch = fetchMock as typeof window.fetch;
    await import("@/lib/networkGuard");

    const guardedFetch = window.fetch;

    expect(() => guardedFetch("https://evil.com")).toThrow("DIRECT_FETCH_BLOCKED");
    await expect(guardedFetch("/api/health")).resolves.toBeInstanceOf(Response);

    window.fetch = originalFetch;
  });
});
