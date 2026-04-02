import { beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  api: vi.fn(),
}));

describe("contract:e2e", () => {
  beforeEach(() => {
    vi.mocked(api).mockReset();
  });

  it("otp -> verify -> telephony", async () => {
    vi.mocked(api)
      .mockResolvedValueOnce({ message: "OTP sent" })
      .mockResolvedValueOnce({ token: "session-token-1" })
      .mockResolvedValueOnce({ token: "voice-token-1" });

    await api("/api/auth/start-otp", {
      method: "POST",
      body: { phone: "+61400000000" },
    });

    const v = await api<{ token: string }>("/api/auth/verify-otp", {
      method: "POST",
      body: {
        phone: "+61400000000",
        code: "000000",
      },
    });

    const t = await api<{ token: string }>("/api/telephony/token");

    expect(v.token).toBeTruthy();
    expect(t.token).toBeTruthy();
  });

  it("returns meaningful api errors", async () => {
    vi.mocked(api).mockRejectedValueOnce(new Error("invalid otp"));

    await expect(
      api("/api/auth/verify-otp", {
        method: "POST",
        body: {
          phone: "+61400000000",
          code: "bad-code",
        },
      }),
    ).rejects.toThrow("invalid otp");
  });
});
