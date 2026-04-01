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
      .mockResolvedValueOnce({ message: "OTP sent" })
      .mockResolvedValueOnce({ token: "session-token-1" })
      .mockResolvedValueOnce({ token: "voice-token-1" });

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

    expect(v.token).toBeTruthy();
    expect(t.token).toBeTruthy();
  });

  it("returns meaningful api errors", async () => {
    vi.mocked(apiClient).mockRejectedValueOnce(new Error("invalid otp"));

    await expect(
      apiClient("/api/auth/verify-otp", {
        method: "POST",
        body: {
          phone: "+61400000000",
          code: "bad-code",
        },
      }),
    ).rejects.toThrow("invalid otp");
  });
});
