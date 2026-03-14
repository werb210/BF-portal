import { Call, Device } from "@twilio/voice-sdk";
import { getVoiceToken } from "./getVoiceToken";
import { useCallState } from "./state/callState";

let device: Device | null = null;
let bootstrapPromise: Promise<Device> | null = null;
let activeCall: Call | null = null;
let deviceInitialized = false;

const activeStatuses = new Set(["connecting", "ringing", "in_call"]);

const clearActiveCall = (call?: Call) => {
  if (!call || activeCall === call) {
    activeCall = null;
  }
};

const onCallDisconnected = (call?: Call) => {
  clearActiveCall(call);
  useCallState.getState().endCall();
};

const setFailure = (message: string) => {
  clearActiveCall();
  useCallState.getState().setCallFailed(message);
};

const bindCallHandlers = (call: Call) => {
  call.on("ringing", () => {
    useCallState.getState().setCallRinging();
  });

  call.on("accept", () => {
    activeCall = call;
    useCallState.getState().setCallInProgress(call);
  });

  call.on("disconnect", () => {
    onCallDisconnected(call);
  });

  call.on("cancel", () => {
    onCallDisconnected(call);
  });

  call.on("reject", () => {
    onCallDisconnected(call);
  });

  call.on("error", (error: Error) => {
    const message = error.message || "Call failed.";
    setFailure(message);
  });
};

async function initializeDevice() {
  if (deviceInitialized) {
    if (device) return device;
    if (bootstrapPromise) return bootstrapPromise;
  }
  deviceInitialized = true;
  const token = await getVoiceToken();
  const nextDevice = new Device(token);

  nextDevice.on("incoming", (call: Call) => {
    const state = useCallState.getState();

    if (activeStatuses.has(state.callStatus)) {
      call.reject();
      return;
    }

    state.receiveIncomingCall(call);
    bindCallHandlers(call);
  });

  nextDevice.on("error", (error: Error) => {
    setFailure(error.message || "Voice device error.");
  });

  nextDevice.on("cancel", () => {
    onCallDisconnected();
  });

  nextDevice.on("unregistered", () => {
    onCallDisconnected();
    setFailure("Voice device disconnected. Please try again.");
    device = null;
    bootstrapPromise = null;
    deviceInitialized = false;
  });

  await nextDevice.register();
  device = nextDevice;
  return nextDevice;
}

export async function bootstrapVoice() {
  if (device) {
    return device;
  }

  if (!bootstrapPromise) {
    bootstrapPromise = initializeDevice()
      .catch(error => {
        const message = error instanceof Error ? error.message : "Unable to initialize voice calling.";
        setFailure(message);
        device = null;
        deviceInitialized = false;
        throw error;
      })
      .finally(() => {
        if (!device) {
          bootstrapPromise = null;
        }
      });
  }

  return bootstrapPromise;
}

export async function startPortalCall(to: string) {
  const voiceDevice = device ?? (await bootstrapVoice());
  const normalizedDigits = to.replace(/\D/g, "");

  if (!normalizedDigits) {
    throw new Error("Enter a valid phone number.");
  }

  const normalizedTo = `+${normalizedDigits}`;
  const state = useCallState.getState();

  if (activeStatuses.has(state.callStatus)) {
    throw new Error("A call is already in progress.");
  }

  state.startOutgoingCall(normalizedTo);

  try {
    const call = await voiceDevice.connect({
      params: {
        To: normalizedTo
      }
    });

    activeCall = call;
    useCallState.getState().setCallInProgress(call);
    bindCallHandlers(call);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to start call.";
    setFailure(message);
    throw error;
  }
}

export function answerIncomingCall() {
  const { incomingCall } = useCallState.getState();

  if (!incomingCall) {
    return;
  }

  incomingCall.accept();
  activeCall = incomingCall;
  useCallState.getState().acceptIncomingCall(incomingCall);
}

export function declineIncomingCall() {
  const { incomingCall } = useCallState.getState();

  if (!incomingCall) {
    useCallState.getState().declineIncomingCall();
    return;
  }

  incomingCall.reject();
  clearActiveCall(incomingCall);
  useCallState.getState().declineIncomingCall();
}

export function hangupPortalCall() {
  const currentCall = activeCall;

  if (!currentCall) {
    useCallState.getState().endCall();
    return;
  }

  currentCall.disconnect();
  onCallDisconnected(currentCall);
}

export function muteCall() {
  activeCall?.mute(true);
}

export function unmuteCall() {
  activeCall?.mute(false);
}


export async function destroyVoiceDevice() {
  if (activeCall) {
    activeCall.disconnect();
  }
  activeCall = null;
  if (device) {
    device.destroy();
  }
  device = null;
  bootstrapPromise = null;
  deviceInitialized = false;
}
