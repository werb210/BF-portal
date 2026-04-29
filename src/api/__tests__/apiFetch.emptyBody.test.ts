// BF_PORTAL_REFRESH_AND_PARSE_v55_PORTAL — apiFetch must not throw on
// 204 or empty bodies (DELETE handlers are the canonical case).
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const realFetch = global.fetch;

describe("BF_PORTAL_REFRESH_AND_PARSE_v55_PORTAL apiFetch empty body", () => {
  beforeEach(() => {
    localStorage.setItem("auth_token", "test-token");
  });
  afterEach(() => {
    global.fetch = realFetch;
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("returns undefined for 204 No Content", async () => {
    global.fetch = (vi.fn(async () => new Response(null, { status: 204 })) as unknown) as typeof fetch;
    const { default: api } = await import("@/api");
    const result = await api.delete("/api/portal/lenders/abc");
    expect(result).toBeUndefined();
  });

  it("returns undefined for 200 with empty body", async () => {
    global.fetch = (vi.fn(async () => new Response("", { status: 200 })) as unknown) as typeof fetch;
    const { default: api } = await import("@/api");
    const result = await api.delete("/api/portal/lenders/abc");
    expect(result).toBeUndefined();
  });

  it("still parses JSON bodies normally", async () => {
    global.fetch = (vi.fn(async () => new Response(JSON.stringify({ ok: true, id: "x" }), {
      status: 200, headers: { "Content-Type": "application/json" },
    })) as unknown) as typeof fetch;
    const { default: api } = await import("@/api");
    const result = await api.get("/api/portal/lenders");
    expect(result).toEqual({ ok: true, id: "x" });
  });
});
