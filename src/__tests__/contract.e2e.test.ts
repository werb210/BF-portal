import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiRequest } from "@/lib/apiClient";

vi.mock("@/lib/apiClient", () => ({
  apiRequest: vi.fn(),
}));

describe("contract:e2e", () => {
  beforeEach(() => {
    vi.mocked(apiRequest).mockReset();
  });

  it("otp -> verify -> telephony", async () => {
    vi.mocked(apiRequest)
      .mockResolvedValueOnce({ ok: true, message: "OTP sent" })
      .mockResolvedValueOnce({ ok: true, token: "session-token-1" })
      .mockResolvedValueOnce({ token: "voice-token-1" });

    await apiRequest("/api/auth/otp/start", {
      method: "POST",
      body: JSON.stringify({ phone: "+61400000000" }),
    });

    const v = await apiRequest<{ token: string }>("/api/auth/otp/verify", {
      method: "POST",
      body: JSON.stringify({
        phone: "+61400000000",
        code: "000000",
      }),
    });

    const t = await apiRequest<{ token: string }>("/api/telephony/token");

    expect(v.token).toBeTruthy();
    expect(t.token).toBeTruthy();
  });

  it("returns meaningful api errors", async () => {
    vi.mocked(apiRequest).mockRejectedValueOnce(new Error("invalid otp"));

    await expect(
      apiRequest("/api/auth/otp/verify", {
        method: "POST",
        body: JSON.stringify({
          phone: "+61400000000",
          code: "bad-code",
        }),
      })
    ).rejects.toThrow("invalid otp");
  });
});
