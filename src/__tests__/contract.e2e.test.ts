import { beforeEach, describe, expect, it } from "vitest";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";

import { apiRequest } from "@/lib/api";

describe("contract:e2e", () => {
  const mock = new MockAdapter(axios, { onNoMatch: "throwException" });

  beforeEach(() => {
    mock.reset();

    mock.onPost("/api/auth/otp/start").reply(200, { success: true, data: { ok: true, message: "OTP sent" } });
    mock.onPost("/api/auth/otp/verify").reply(200, { success: true, data: { ok: true, token: "session-token-1" } });
    mock.onGet("/api/telephony/token").reply(200, { success: true, data: { token: "voice-token-1" } });
  });

  it("otp -> verify -> telephony", async () => {
    await apiRequest("/auth/otp/start", {
      method: "POST",
      body: { phone: "+61400000000" }
    });

    const v = await apiRequest<{ token: string }>("/auth/otp/verify", {
      method: "POST",
      body: { phone: "+61400000000", code: "000000" }
    });

    const t = await apiRequest<{ token: string }>("/telephony/token", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${v.data.token}`
      }
    });

    expect(v.data.token).toBeTruthy();
    expect(t.data.token).toBeTruthy();
  });

  it("returns meaningful api errors", async () => {
    mock.onPost("/api/auth/otp/verify").reply(400, { error: "invalid otp" });

    await expect(
      apiRequest("/auth/otp/verify", {
        method: "POST",
        body: { phone: "+61400000000", code: "bad-code" }
      })
    ).rejects.toThrow("invalid otp");
  });
});
