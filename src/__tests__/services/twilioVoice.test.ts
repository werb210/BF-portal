import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getVoiceTokenMock,
  registerMock,
  destroyMock,
  deviceCtorMock
} = vi.hoisted(() => ({
  getVoiceTokenMock: vi.fn(),
  registerMock: vi.fn(async () => undefined),
  destroyMock: vi.fn(),
  deviceCtorMock: vi.fn(() => ({
    register: registerMock,
    destroy: destroyMock
  }))
}));

vi.mock("@/telephony/getVoiceToken", () => ({
  getVoiceToken: getVoiceTokenMock
}));

vi.mock("@twilio/voice-sdk", () => ({
  Device: deviceCtorMock
}));

import { destroyTwilioVoice, fetchTwilioToken, initializeTwilioVoice } from "@/services/twilioVoice";

describe("twilioVoice service", () => {
  beforeEach(() => {
    getVoiceTokenMock.mockReset();
    registerMock.mockClear();
    destroyMock.mockClear();
    deviceCtorMock.mockClear();
    destroyTwilioVoice();
  });

  it("requests token from GET /api/telephony/token via shared loader", async () => {
    getVoiceTokenMock.mockResolvedValue("TWILIO_TOKEN");

    await expect(fetchTwilioToken()).resolves.toBe("TWILIO_TOKEN");

    expect(getVoiceTokenMock).toHaveBeenCalledTimes(1);
  });

  it("initializes and registers device once", async () => {
    getVoiceTokenMock.mockResolvedValue("TWILIO_TOKEN");

    const first = await initializeTwilioVoice();
    const second = await initializeTwilioVoice();

    expect(first).toBe(second);
    expect(deviceCtorMock).toHaveBeenCalledTimes(1);
    expect(deviceCtorMock).toHaveBeenCalledWith("TWILIO_TOKEN");
    expect(registerMock).toHaveBeenCalledTimes(1);
    expect(getVoiceTokenMock).toHaveBeenCalledTimes(1);
  });
});
