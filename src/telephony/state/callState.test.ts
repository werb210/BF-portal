import type { Call } from "@twilio/voice-sdk";
import { beforeEach, describe, expect, it } from "vitest";
import { useCallState } from "./callState";

type MockCall = {
  accept: () => void;
  disconnect: () => void;
  reject: () => void;
};

const createMockCall = (): MockCall => ({
  accept: () => undefined,
  disconnect: () => undefined,
  reject: () => undefined
});

describe("useCallState", () => {
  beforeEach(() => {
    useCallState.getState().clearCall();
  });

  it("resets state for incoming answer, decline, and disconnect flows", () => {
    const incomingCall = createMockCall() as unknown as Call;

    useCallState.getState().receiveIncomingCall(incomingCall);
    expect(useCallState.getState().incomingCall).toBe(incomingCall);
    expect(useCallState.getState().callStatus).toBe("ringing");

    useCallState.getState().acceptIncomingCall(incomingCall);
    expect(useCallState.getState().incomingCall).toBeNull();
    expect(useCallState.getState().activeCall).toBe(incomingCall);
    expect(useCallState.getState().callStatus).toBe("in_call");

    useCallState.getState().endCall();
    expect(useCallState.getState().activeCall).toBeNull();
    expect(useCallState.getState().callStatus).toBe("idle");

    useCallState.getState().receiveIncomingCall(incomingCall);
    useCallState.getState().declineIncomingCall();
    expect(useCallState.getState().incomingCall).toBeNull();
    expect(useCallState.getState().callStatus).toBe("idle");
  });

  it("tracks outgoing call connect/ringing/in_call then hangup reset", () => {
    const outgoingCall = createMockCall() as unknown as Call;

    useCallState.getState().startOutgoingCall("+15551234567");
    expect(useCallState.getState().outgoingTo).toBe("+15551234567");
    expect(useCallState.getState().callStatus).toBe("connecting");

    useCallState.getState().setCallRinging();
    expect(useCallState.getState().callStatus).toBe("ringing");

    useCallState.getState().setCallInProgress(outgoingCall);
    expect(useCallState.getState().activeCall).toBe(outgoingCall);
    expect(useCallState.getState().callStatus).toBe("in_call");

    useCallState.getState().endCall();
    expect(useCallState.getState().outgoingTo).toBeNull();
    expect(useCallState.getState().activeCall).toBeNull();
    expect(useCallState.getState().incomingCall).toBeNull();
    expect(useCallState.getState().callStatus).toBe("idle");
  });
});
