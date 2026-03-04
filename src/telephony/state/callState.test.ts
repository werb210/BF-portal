import type { Call } from "@twilio/voice-sdk";
import { beforeEach, describe, expect, it } from "vitest";
import { useCallState } from "./callState";

type MockCall = {
  accept: () => void;
  disconnect: () => void;
};

const createMockCall = (): MockCall => ({
  accept: () => undefined,
  disconnect: () => undefined
});

describe("useCallState", () => {
  beforeEach(() => {
    useCallState.getState().clearCall();
  });

  it("tracks incoming call answer and clears after disconnect", () => {
    const incomingCall = createMockCall();

    useCallState.getState().setIncomingCall(incomingCall as unknown as Call);
    useCallState.getState().setCallStatus("ringing");

    incomingCall.accept();
    useCallState.getState().setActiveCall(incomingCall as unknown as Call);
    useCallState.getState().setIncomingCall(null);
    useCallState.getState().setCallStatus("in_call");

    expect(useCallState.getState().activeCall).toBe(incomingCall);
    expect(useCallState.getState().callStatus).toBe("in_call");

    incomingCall.disconnect();
    useCallState.getState().clearCall();

    expect(useCallState.getState().activeCall).toBeNull();
    expect(useCallState.getState().incomingCall).toBeNull();
    expect(useCallState.getState().callStatus).toBe("idle");
  });

  it("tracks outgoing call lifecycle and clears on hangup", () => {
    const outgoingCall = createMockCall();

    useCallState.getState().setOutgoingTo("+15551234567");
    useCallState.getState().setCallStatus("connecting");
    expect(useCallState.getState().callStatus).toBe("connecting");

    useCallState.getState().setCallStatus("ringing");
    expect(useCallState.getState().callStatus).toBe("ringing");

    useCallState.getState().setActiveCall(outgoingCall as unknown as Call);
    useCallState.getState().setCallStatus("in_call");
    expect(useCallState.getState().callStatus).toBe("in_call");

    outgoingCall.disconnect();
    useCallState.getState().clearCall();

    expect(useCallState.getState().outgoingTo).toBeNull();
    expect(useCallState.getState().activeCall).toBeNull();
    expect(useCallState.getState().callStatus).toBe("idle");
  });
});
