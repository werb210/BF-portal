import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiRequest } from "@/lib/apiClient";
import { getTelephonyToken } from "@/telephony/getVoiceToken";
import { assertAuthTelephonyFlow } from "./helpers/authTelephonyFlowAssertions";

vi.mock("@/lib/apiClient", () => ({
  apiRequest: vi.fn(),
}));

async function startOtp(payload: { phone: string }) {
  return apiRequest<{ ok: boolean }>("/api/auth/otp/start", {
    method: "POST",
    body: JSON.stringify({ phone: payload.phone }),
  });
}

async function verifyOtp(payload: { phone: string; code: string }) {
  const result = await apiRequest<{ ok: boolean; token: string }>("/api/auth/otp/verify", {
    method: "POST",
    body: JSON.stringify({
      phone: payload.phone,
      code: payload.code,
    }),
  });

  if (!result.token) throw new Error("Missing token");
  sessionStorage.setItem("token", result.token);
  return result;
}

beforeEach(() => {
  vi.mocked(apiRequest).mockReset();
  vi.mocked(apiRequest).mockImplementation(async (path) => {
    if (path === "/api/auth/otp/start") return { ok: true };
    if (path === "/api/auth/otp/verify") return { ok: true, token: "test-token" };
    if (path === "/api/telephony/token") return { token: "voice-token" };
    return {};
  });
});

describe("auth/telephony flow contract checks", () => {
  it("runs OTP -> verify -> telephony token using deterministic API mocks", async () => {
    await assertAuthTelephonyFlow(
      { startOtp, verifyOtp, getTelephonyToken },
      {
        phone: "15551234567",
        otp: "123456",
        expectedSessionToken: "test-token",
        expectedVoiceToken: "voice-token",
      }
    );
  });

  it("fails when telephony response shape is invalid", async () => {
    vi.mocked(apiRequest).mockImplementation(async (path) => {
      if (path === "/api/auth/otp/start") return { ok: true };
      if (path === "/api/auth/otp/verify") return { ok: true, token: "test-token" };
      if (path === "/api/telephony/token") return { ok: true };
      return {};
    });

    await expect(getTelephonyToken()).rejects.toThrow("Telephony token missing");
  });
});
