import { Call, Device } from "@twilio/voice-sdk";
import { getVoiceToken } from "./api/getVoiceToken";
import { useCallState } from "./state/callState";

let device: Device | null = null;
let activeCall: Call | null = null;

const setFailure = (message: string) => {
  useCallState.getState().setCallStatus("failed");
  useCallState.getState().setErrorMessage(message);
};

const resetCallState = () => {
  activeCall = null;
  useCallState.getState().clearCall();
};

const bindCallHandlers = (call: Call) => {
  call.on("ringing", () => {
    useCallState.getState().setCallStatus("ringing");
  });

  call.on("accept", () => {
    useCallState.getState().setActiveCall(call);
    useCallState.getState().setCallStatus("in_call");
    useCallState.getState().setErrorMessage(undefined);
  });

  call.on("disconnect", () => {
    useCallState.getState().setCallStatus("ended");
    resetCallState();
  });

  call.on("cancel", () => {
    useCallState.getState().setCallStatus("ended");
    resetCallState();
  });

  call.on("error", (error: Error) => {
    setFailure(error.message || "Call failed.");
    resetCallState();
  });
};

export async function bootstrapVoice() {
  if (device) {
    return device;
  }

  try {
    const token = await getVoiceToken("staff_portal");
    device = new Device(token);

    device.on("incoming", (call: Call) => {
      const state = useCallState.getState();

      if (state.callStatus === "connecting" || state.callStatus === "ringing" || state.callStatus === "in_call") {
        call.reject();
        return;
      }

      state.setIncomingCall(call);
      state.setCallStatus("ringing");
      state.setErrorMessage(undefined);
      bindCallHandlers(call);
    });

    device.on("error", (error: Error) => {
      setFailure(error.message || "Voice device error.");
      resetCallState();
    });

    device.on("unregistered", () => {
      setFailure("Voice device disconnected. Please try again.");
      resetCallState();
      device = null;
    });

    await device.register();
    return device;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to initialize voice calling.";
    setFailure(message);
    device = null;
    throw error;
  }
}

export async function startPortalCall(to: string) {
  const voiceDevice = device ?? (await bootstrapVoice());
  const normalizedTo = to.replace(/\D/g, "");

  if (!voiceDevice) {
    throw new Error("Voice device not initialized");
  }

  if (!normalizedTo) {
    throw new Error("Enter a valid phone number.");
  }

  useCallState.getState().setOutgoingTo(normalizedTo);
  useCallState.getState().setCallStatus("connecting");
  useCallState.getState().setErrorMessage(undefined);

  try {
    activeCall = await voiceDevice.connect({
      params: {
        To: normalizedTo
      }
    });

    useCallState.getState().setActiveCall(activeCall);
    bindCallHandlers(activeCall);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to start call.";
    setFailure(message);
    resetCallState();
    throw error;
  }
}

export function hangupPortalCall() {
  if (!activeCall) {
    resetCallState();
    return;
  }

  activeCall.disconnect();
  useCallState.getState().setCallStatus("ended");
  resetCallState();
}

export function muteCall() {
  if (activeCall) {
    activeCall.mute(true);
  }
}

export function unmuteCall() {
  if (activeCall) {
    activeCall.mute(false);
  }
}
