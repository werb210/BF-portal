import { create } from "zustand";
export const useCallState = create(set => ({
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
    receiveIncomingCall: incomingCall => set({
        incomingCall,
        activeCall: null,
        outgoingTo: null,
        callStatus: "ringing",
        errorMessage: undefined
    }),
    acceptIncomingCall: activeCall => set({
        incomingCall: null,
        activeCall,
        callStatus: "in_call",
        errorMessage: undefined
    }),
    declineIncomingCall: () => set({
        incomingCall: null,
        callStatus: "idle",
        errorMessage: undefined
    }),
    startOutgoingCall: outgoingTo => set({
        outgoingTo,
        incomingCall: null,
        callStatus: "connecting",
        errorMessage: undefined
    }),
    setCallRinging: () => set({ callStatus: "ringing" }),
    setCallInProgress: activeCall => set({
        activeCall,
        incomingCall: null,
        callStatus: "in_call",
        errorMessage: undefined
    }),
    endCall: () => set({
        incomingCall: null,
        activeCall: null,
        outgoingTo: null,
        callStatus: "idle",
        errorMessage: undefined
    }),
    setCallFailed: errorMessage => set({
        incomingCall: null,
        activeCall: null,
        outgoingTo: null,
        callStatus: "failed",
        errorMessage
    }),
    clearCall: () => set({
        incomingCall: null,
        activeCall: null,
        outgoingTo: null,
        callStatus: "idle",
        errorMessage: undefined
    })
}));
