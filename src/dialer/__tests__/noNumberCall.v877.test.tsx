// BF_PORTAL_v877_NO_NUMBER_CALL - a call with no number, conference or room is never placed; the panel says why.
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  connect: vi.fn(async (_o: any) => ({ started: true })),
  startCall: vi.fn(async (_b: any) => ({ data: { ok: true } } as any)),
}));

vi.mock("@capacitor/app", () => ({ App: { addListener: async () => ({ remove: async () => {} }) } }));
vi.mock("@capacitor/core", () => ({
  Capacitor: { getPlatform: () => "ios", isNativePlatform: () => true, isPluginAvailable: (n: string) => n === "BorealVoice" },
  registerPlugin: () => ({ connect: h.connect, sendDigits: vi.fn(), hangup: vi.fn(), getState: vi.fn(async () => ({})), addListener: async () => ({ remove: async () => {} }) }),
}));
vi.mock("@/dialer/api", () => ({
  dialerApi: { startCall: h.startCall, voiceTokenFor: vi.fn(async () => ({ data: { token: "t" } })), voiceToken: vi.fn(async () => ({ data: { token: "t" } })) },
}));
vi.mock("@/native/dialerLauncher", () => ({ launchNativeBorealDialer: vi.fn(async () => false) }));
vi.mock("@/dialer/debugRing", () => ({ ringPush: vi.fn() }));

import { hasCallTarget, startNativeOutgoing } from "../nativeVoice";
import { startInternalCall, answerIncoming } from "../actions";
import { useDialer } from "../store";

beforeEach(() => {
  h.connect.mockClear();
  h.startCall.mockClear();
  useDialer.getState().reset();
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: undefined });
});

describe("a call with nothing to dial", () => {
  it("knows what counts as something to call", () => {
    expect(hasCallTarget({ To: "+14035550100" })).toBe(true);
    expect(hasCallTarget({ conferenceFriendly: "conf-1" })).toBe(true);
    expect(hasCallTarget({ meetingSlug: "weekly" })).toBe(true);
    expect(hasCallTarget({ To: "", conferenceFriendly: undefined, silo: "BF" })).toBe(false);
  });

  it("the Mac app does not place it and says why", async () => {
    expect(await startNativeOutgoing({ To: " ", silo: "BF" }, { label: "x" })).toBe("no_number");
    expect(h.connect).not.toHaveBeenCalled();
  });

  it("a staff call the server set up without a conference is not placed", async () => {
    await startInternalCall("andrew", { contactName: "Andrew" });
    expect(h.connect).not.toHaveBeenCalled();
    expect(useDialer.getState().status).toBe("error");
    expect(useDialer.getState().error).toBe("no_number");
  });

  it("answering an alert with no conference does not place an empty call", async () => {
    const connect = vi.fn();
    useDialer.setState({ device: { connect } as any, incoming: { conferenceFriendly: "" } as any });
    await answerIncoming();
    expect(connect).not.toHaveBeenCalled();
    expect(useDialer.getState().error).toBe("no_number");
  });
});
