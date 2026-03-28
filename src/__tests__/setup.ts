import { beforeEach } from "vitest";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";

const globalMock = new MockAdapter(axios, { onNoMatch: "throwException" });

beforeEach(() => {
  localStorage.setItem("auth_token", "test-token");

  globalMock.reset();

  // OTP start
  globalMock.onPost("/api/auth/otp/start").reply(200, { success: true, data: { ok: true } });

  // OTP verify
  globalMock.onPost("/api/auth/otp/verify").reply(200, {
    success: true,
    data: {
      token: "test-token",
      ok: true,
    },
  });

  // Telephony
  globalMock.onGet("/api/telephony/token").reply(200, {
    success: true,
    data: {
      token: "voice-token",
    },
  });
});

(globalThis as any).XMLHttpRequest = undefined;
