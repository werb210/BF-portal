import { create } from "zustand";
import { Call } from "@twilio/voice-sdk";

interface CallState {
  incomingCall: Call | null;
  activeCall: Call | null;
  outgoingTo: string | null;
  callStatus: "idle" | "connecting" | "ringing" | "in_call" | "ended" | "failed";
  errorMessage?: string;
  setIncomingCall: (call: Call | null) => void;
  setActiveCall: (call: Call | null) => void;
  setOutgoingTo: (to: string | null) => void;
  setCallStatus: (status: CallState["callStatus"]) => void;
  setErrorMessage: (message?: string) => void;
  clearCall: () => void;
}

export const useCallState = create<CallState>(set => ({
  incomingCall: null,
  activeCall: null,
  outgoingTo: null,
  callStatus: "idle",
  errorMessage: undefined,
  setIncomingCall: call => set({ incomingCall: call }),
  setActiveCall: call => set({ activeCall: call }),
  setOutgoingTo: outgoingTo => set({ outgoingTo }),
  setCallStatus: callStatus => set({ callStatus }),
  setErrorMessage: errorMessage => set({ errorMessage }),
  clearCall: () =>
    set({
      incomingCall: null,
      activeCall: null,
      outgoingTo: null,
      callStatus: "idle",
      errorMessage: undefined
    })
}));
