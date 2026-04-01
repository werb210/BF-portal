import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/lib/apiClient";

vi.mock("@/lib/apiClient", () => ({
  apiClient: vi.fn(),
}));

describe("contract:e2e", () => {
  beforeEach(() => {
    vi.mocked(apiClient).mockReset();
  });

  it("otp -> verify -> telephony", async () => {
    vi.mocked(apiClient)
      .mockResolvedValueOnce({ success: true, data: { message: "OTP sent" } })
      .mockResolvedValueOnce({ success: true, data: { token: "session-token-1" } })
      .mockResolvedValueOnce({ success: true, data: { token: "voice-token-1" } });

    await apiClient("/api/auth/start-otp", {
      method: "POST",
      body: { phone: "+61400000000" },
    });

    const v = await apiClient<{ token: string }>("/api/auth/verify-otp", {
      method: "POST",
      body: {
        phone: "+61400000000",
        code: "000000",
      },
    });

    const t = await apiClient<{ token: string }>("/api/telephony/token");

    expect(v.success && v.data.token).toBeTruthy();
    expect(t.success && t.data.token).toBeTruthy();
  });

  it("returns meaningful api errors", async () => {
    vi.mocked(apiClient).mockResolvedValueOnce({ success: false, error: "invalid otp" });

    await expect(
      apiClient("/api/auth/verify-otp", {
        method: "POST",
        body: {
          phone: "+61400000000",
          code: "bad-code",
        },
      }),
    ).resolves.toEqual({ success: false, error: "invalid otp" });
  });
});
