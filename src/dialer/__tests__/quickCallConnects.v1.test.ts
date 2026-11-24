// BF_PORTAL_QUICK_CALL_FIX_v1 - a quick call to a colleague shows as connected once they answer.
import { describe, expect, it, vi } from "vitest";

vi.mock("../sanityCheck", () => ({ preflight: async () => ({ ok: true }) }));
vi.mock("../nativeVoice", () => ({ callsNatively: () => false, startNativeOutgoing: vi.fn(), nativeHangup: vi.fn(), nativeSendDigits: vi.fn(), hasCallTarget: (t: { conferenceFriendly?: string }) => !!t.conferenceFriendly }));
vi.mock("@/native/dialerLauncher", () => ({ launchNativeBorealDialer: async () => false }));
vi.mock("../api", () => ({ dialerApi: { startCall: vi.fn(async () => ({ ok: true, conferenceFriendly: "bf-1" })) } }));

import { startInternalCall } from "../actions";
import { useDialer } from "../store";

describe("quick call", () => {
  it("goes ringing, then connected, then ready when it ends", async () => {
    const handlers: Record<string, (...a: any[]) => void> = {};
    const call = { on: (ev: string, fn: (...a: any[]) => void) => { handlers[ev] = fn; } };
    useDialer.setState({ device: { connect: vi.fn(async () => call) } as any });
    await startInternalCall("00000000-0000-0000-0000-000000000100", { contactName: "Andrew" });
    expect(useDialer.getState().status).toBe("dialing");
    handlers.ringing!();
    expect(useDialer.getState().status).toBe("ringing");
    handlers.accept!();
    expect(useDialer.getState().status).toBe("connected");
    handlers.disconnect!();
    expect(useDialer.getState().status).toBe("ready");
  });
});
