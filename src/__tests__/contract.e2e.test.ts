import { beforeEach, describe, expect, it } from "vitest";
import MockAdapter from "axios-mock-adapter";

import { ApiError, api, apiRequest } from "@/lib/api";

describe("contract:e2e", () => {
  const mock = new MockAdapter(api, { onNoMatch: "throwException" });

  beforeEach(() => {
    mock.reset();

    mock.onPost("/api/auth/otp/start").reply(200, { ok: true, message: "OTP sent" });
    mock.onPost("/api/auth/otp/verify").reply(200, { ok: true, token: "session-token-1" });
    mock.onGet("/api/telephony/token").reply(200, { token: "voice-token-1" });
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
        Authorization: `Bearer ${v.token}`
      }
    });

    expect(v.token).toBeTruthy();
    expect(t.token).toBeTruthy();
  });

  it("returns meaningful api errors", async () => {
    mock.onPost("/api/auth/otp/verify").reply(400, { error: "invalid otp" });

    await expect(
      apiRequest("/auth/otp/verify", {
        method: "POST",
        body: { phone: "+61400000000", code: "bad-code" }
      })
    ).rejects.toEqual(expect.objectContaining<ApiError>({
      name: "ApiError",
      message: "invalid otp",
      status: 400
    }));
  });
});
