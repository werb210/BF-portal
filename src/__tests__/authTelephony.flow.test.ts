import { beforeEach, describe, expect, it } from "vitest";
import MockAdapter from "axios-mock-adapter";

import { apiRequest, api } from "@/lib/api";
import { getTelephonyToken } from "@/telephony/getVoiceToken";
import { assertAuthTelephonyFlow } from "./helpers/authTelephonyFlowAssertions";

const mock = new MockAdapter(api, { onNoMatch: "throwException" });

async function startOtp(payload: { phone: string }) {
  return apiRequest<{ ok: boolean }>("/auth/otp/start", {
    method: "POST",
    body: { phone: payload.phone },
  });
}

async function verifyOtp(payload: { phone: string; code: string }) {
  const res = await apiRequest<{ ok: boolean; token: string }>("/auth/otp/verify", {
    method: "POST",
    body: { phone: payload.phone, code: payload.code },
  });

  if (!res?.token) throw new Error("Missing token");
  localStorage.setItem("token", res.token);
  return res;
}

beforeEach(() => {
  mock.reset();

  mock.onPost("/api/auth/otp/start").reply(200, { ok: true });
  mock.onPost("/api/auth/otp/verify").reply(200, { ok: true, token: "test-token" });
  mock.onGet("/api/telephony/token").reply(200, { token: "voice-token" });
});

describe("auth/telephony flow contract checks", () => {
  it("runs OTP -> verify -> telephony token using deterministic axios mocks", async () => {
    await assertAuthTelephonyFlow(
      { startOtp, verifyOtp, getTelephonyToken },
      {
        phone: "15551234567",
        otp: "123456",
        expectedSessionToken: "test-token",
        expectedVoiceToken: "voice-token"
      }
    );
  });

  it("fails when telephony response shape is invalid", async () => {
    mock.onGet("/api/telephony/token").reply(200, { ok: true });

    await expect(getTelephonyToken()).rejects.toThrow("Telephony token missing");
  });
});
