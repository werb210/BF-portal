import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  fetchMock,
  withApiBaseMock,
  registerMock,
  destroyMock,
  deviceCtorMock
} = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  withApiBaseMock: vi.fn((path: string) => path),
  registerMock: vi.fn(async () => undefined),
  destroyMock: vi.fn(),
  deviceCtorMock: vi.fn(() => ({
    register: registerMock,
    destroy: destroyMock
  }))
}));

vi.stubGlobal("fetch", fetchMock);

vi.mock("@/lib/apiBase", () => ({
  withApiBase: withApiBaseMock
}));

vi.mock("@twilio/voice-sdk", () => ({
  Device: deviceCtorMock
}));

import { destroyTwilioVoice, fetchTwilioToken, initializeTwilioVoice } from "@/services/twilioVoice";

describe("twilioVoice service", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    withApiBaseMock.mockClear();
    registerMock.mockClear();
    destroyMock.mockClear();
    deviceCtorMock.mockClear();
    destroyTwilioVoice();
  });

  it("requests token from GET /api/telephony/token", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ token: "TWILIO_TOKEN" })
    });

    await expect(fetchTwilioToken()).resolves.toBe("TWILIO_TOKEN");

    expect(withApiBaseMock).toHaveBeenCalledWith("/api/telephony/token");
    expect(fetchMock).toHaveBeenCalledWith("/api/telephony/token", { credentials: "include" });
  });

  it("initializes and registers device once", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ token: "TWILIO_TOKEN" })
    });

    const first = await initializeTwilioVoice();
    const second = await initializeTwilioVoice();

    expect(first).toBe(second);
    expect(deviceCtorMock).toHaveBeenCalledTimes(1);
    expect(deviceCtorMock).toHaveBeenCalledWith("TWILIO_TOKEN");
    expect(registerMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
