import { Device, Call } from "@twilio/voice-sdk";
import { getVoiceToken } from "./api/getVoiceToken";
import { useCallState } from "./state/callState";

let device: Device | null = null;
let activeCall: Call | null = null;

export async function bootstrapVoice() {
  const token = await getVoiceToken("staff_portal");

  device = new Device(token);

  device.on("registered", () => {
    console.log("Staff portal voice device registered");
  });

  device.on("incoming", (call: Call) => {
    console.log("Incoming client call");
    useCallState.getState().setIncomingCall(call);

    call.on("disconnect", () => {
      activeCall = null;
      useCallState.getState().clearCall();
    });
  });

  device.on("error", (error: Error) => {
    console.error("Twilio voice error", error);
  });

  await device.register();
}

export async function startPortalCall(to: string) {
  if (!device) throw new Error("Voice device not initialized");

  activeCall = await device.connect({
    params: {
      To: to
    }
  });
}

export function hangupPortalCall() {
  if (activeCall) {
    activeCall.disconnect();
    activeCall = null;
  }
}
