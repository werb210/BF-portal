import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  tokenMock,
  deviceRegisterMock,
  deviceConnectMock,
  deviceDestroyMock,
  deviceOnMock,
  callOnMock
} = vi.hoisted(() => ({
  tokenMock: vi.fn(async () => "TWILIO_TOKEN"),
  deviceRegisterMock: vi.fn(async () => undefined),
  deviceConnectMock: vi.fn(),
  deviceDestroyMock: vi.fn(),
  deviceOnMock: vi.fn(),
  callOnMock: vi.fn()
}));

const deviceHandlers: Record<string, (...args: any[]) => void> = {};
const callHandlers: Record<string, (...args: any[]) => void> = {};

vi.mock("@/telephony/getVoiceToken", () => ({
  getVoiceToken: tokenMock
}));

vi.mock("@twilio/voice-sdk", () => {
  class Device {
    on(event: string, handler: (...args: any[]) => void) {
      deviceOnMock(event, handler);
      deviceHandlers[event] = handler;
    }
    register = deviceRegisterMock;
    connect = deviceConnectMock;
    destroy = deviceDestroyMock;
  }

  return { Device, Call: class {} };
});

describe("telephony bootstrapVoice", () => {
  beforeEach(() => {
    vi.resetModules();
    tokenMock.mockClear();
    deviceRegisterMock.mockClear();
    deviceConnectMock.mockReset();
    deviceDestroyMock.mockClear();
    deviceOnMock.mockClear();
    callOnMock.mockClear();
    for (const key of Object.keys(deviceHandlers)) delete deviceHandlers[key];
    for (const key of Object.keys(callHandlers)) delete callHandlers[key];
  });

  afterEach(async () => {
    const module = await import("@/telephony/bootstrapVoice");
    await module.destroyVoiceDevice();
  });

  it("initializes device with fetched token and registers", async () => {
    const module = await import("@/telephony/bootstrapVoice");

    await module.bootstrapVoice();

    expect(tokenMock).toHaveBeenCalledTimes(1);
    expect(deviceRegisterMock).toHaveBeenCalledTimes(1);
    expect(deviceOnMock).toHaveBeenCalledWith("incoming", expect.any(Function));
  });

  it("connects call and handles disconnect event", async () => {
    const fakeCall = {
      on: (event: string, handler: (...args: any[]) => void) => {
        callOnMock(event, handler);
        callHandlers[event] = handler;
      },
      disconnect: vi.fn(),
      mute: vi.fn()
    };
    deviceConnectMock.mockResolvedValue(fakeCall);

    const module = await import("@/telephony/bootstrapVoice");
    const { useCallState } = await import("@/telephony/state/callState");

    useCallState.getState().clearCall();

    await module.startPortalCall("+1 (555) 555-0100");
    expect(deviceConnectMock).toHaveBeenCalledWith({ params: { To: "+15555550100" } });
    expect(useCallState.getState().callStatus).toBe("in_call");

    callHandlers.disconnect?.();
    expect(useCallState.getState().callStatus).toBe("idle");
  });
});
