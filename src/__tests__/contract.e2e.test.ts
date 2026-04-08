import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "@/api";
import { clearToken, setToken } from "@/auth/token";

describe("contract:e2e", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    clearToken();
    setToken("session-token-1");
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("otp -> verify uses real auth contract paths", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "ok", data: { message: "OTP sent" } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "ok", data: { token: "session-token-1" } }), { status: 200 })) as typeof fetch;

    await api("/api/auth/otp/start", {
      method: "POST",
      body: { phone: "+61400000000" },
    });

    const verify = await api<{ token: string }>("/api/auth/otp/verify", {
      method: "POST",
      body: {
        phone: "+61400000000",
        code: "000000",
      },
    });

    expect(verify.token).toBe("session-token-1");
    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("/api/auth/otp/start"),
      expect.objectContaining({ method: "POST" }),
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("/api/auth/otp/verify"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("returns API_ERROR for auth contract failures", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ status: "error", error: { message: "invalid otp" } }), { status: 401 }),
    ) as typeof fetch;

    await expect(
      api("/api/auth/otp/verify", {
        method: "POST",
        body: {
          phone: "+61400000000",
          code: "bad-code",
        },
      }),
    ).rejects.toThrow("API_ERROR");
  });
});
