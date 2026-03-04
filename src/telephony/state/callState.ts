import { create } from "zustand";
import { Call } from "@twilio/voice-sdk";

interface CallState {
  incomingCall: Call | null;
  activeCall: Call | null;
  setIncomingCall: (call: Call | null) => void;
  setActiveCall: (call: Call | null) => void;
  clearCall: () => void;
}

export const useCallState = create<CallState>(set => ({
  incomingCall: null,
  activeCall: null,
  setIncomingCall: call => set({ incomingCall: call }),
  setActiveCall: call => set({ activeCall: call }),
  clearCall: () => set({ incomingCall: null, activeCall: null })
}));
