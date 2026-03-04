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
  receiveIncomingCall: (call: Call) => void;
  acceptIncomingCall: (call: Call) => void;
  declineIncomingCall: () => void;
  startOutgoingCall: (to: string) => void;
  setCallRinging: () => void;
  setCallInProgress: (call: Call) => void;
  endCall: () => void;
  setCallFailed: (message: string) => void;
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
  receiveIncomingCall: incomingCall =>
    set({
      incomingCall,
      activeCall: null,
      outgoingTo: null,
      callStatus: "ringing",
      errorMessage: undefined
    }),
  acceptIncomingCall: activeCall =>
    set({
      incomingCall: null,
      activeCall,
      callStatus: "in_call",
      errorMessage: undefined
    }),
  declineIncomingCall: () =>
    set({
      incomingCall: null,
      callStatus: "idle",
      errorMessage: undefined
    }),
  startOutgoingCall: outgoingTo =>
    set({
      outgoingTo,
      incomingCall: null,
      callStatus: "connecting",
      errorMessage: undefined
    }),
  setCallRinging: () => set({ callStatus: "ringing" }),
  setCallInProgress: activeCall =>
    set({
      activeCall,
      incomingCall: null,
      callStatus: "in_call",
      errorMessage: undefined
    }),
  endCall: () =>
    set({
      incomingCall: null,
      activeCall: null,
      outgoingTo: null,
      callStatus: "idle",
      errorMessage: undefined
    }),
  setCallFailed: errorMessage =>
    set({
      incomingCall: null,
      activeCall: null,
      outgoingTo: null,
      callStatus: "failed",
      errorMessage
    }),
  clearCall: () =>
    set({
      incomingCall: null,
      activeCall: null,
      outgoingTo: null,
      callStatus: "idle",
      errorMessage: undefined
    })
}));
