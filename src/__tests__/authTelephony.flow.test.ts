import { beforeEach, describe, expect, it } from "vitest";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";

import { apiRequest } from "@/lib/api";
import { getTelephonyToken } from "@/telephony/getVoiceToken";
import { assertAuthTelephonyFlow } from "./helpers/authTelephonyFlowAssertions";

const mock = new MockAdapter(axios, { onNoMatch: "throwException" });

async function startOtp(payload: { phone: string }) {
  const res = await apiRequest<{ ok: boolean }>("/auth/otp/start", {
    method: "POST",
    body: { phone: payload.phone },
  });
  return res.data;
}

async function verifyOtp(payload: { phone: string; code: string }) {
  const res = await apiRequest<{ ok: boolean; token: string }>("/auth/otp/verify", {
    method: "POST",
    body: { phone: payload.phone, code: payload.code },
  });

  if (!res.data?.token) throw new Error("Missing token");
  localStorage.setItem("token", res.data.token);
  return res.data;
}

beforeEach(() => {
  mock.reset();

  mock.onPost("/api/auth/otp/start").reply(200, { success: true, data: { ok: true } });
  mock.onPost("/api/auth/otp/verify").reply(200, { success: true, data: { ok: true, token: "test-token" } });
  mock.onGet("/api/telephony/token").reply(200, { success: true, data: { token: "voice-token" } });
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
    mock.onGet("/api/telephony/token").reply(200, { success: true, data: { ok: true } });

    await expect(getTelephonyToken()).rejects.toThrow("Telephony token missing");
  });
});
