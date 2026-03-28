import axios from "axios";
import MockAdapter from "axios-mock-adapter";

import { api } from "@/lib/api";

const globalMock = new MockAdapter(axios, { onNoMatch: "throwException" });
const apiMock = new MockAdapter(api, { onNoMatch: "throwException" });

beforeEach(() => {
  globalMock.reset();
  apiMock.reset();

  // OTP start
  apiMock.onPost("/api/auth/otp/start").reply(200, { success: true, ok: true });

  // OTP verify
  apiMock.onPost("/api/auth/otp/verify").reply(200, {
    token: "test-token",
    ok: true,
  });

  // Telephony
  apiMock.onGet("/api/telephony/token").reply(200, {
    token: "voice-token",
  });
});

(globalThis as any).XMLHttpRequest = undefined;
