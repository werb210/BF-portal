import { Device, Call } from "@twilio/voice-sdk";

let device: Device | null = null;
let activeCall: Call | null = null;

export async function initializeVoice(token: string) {
  device = new Device(token, {
    codecPreferences: [Call.Codec.Opus, Call.Codec.PCMU],
    logLevel: 1
  });

  device.on("registered", () => {
    console.log("Portal voice device registered");
  });

  device.on("incoming", (call: Call) => {
    console.log("Incoming call");

    activeCall = call;

    call.on("disconnect", () => {
      activeCall = null;
    });

    call.accept();
  });

  await device.register();
}

export function getDevice() {
  return device;
}

export function getActiveCall() {
  return activeCall;
}

export async function startCall(number: string) {
  if (!device) {
    throw new Error("Device not initialized");
  }

  activeCall = await device.connect({
    params: {
      To: number
    }
  });

  activeCall.on("disconnect", () => {
    activeCall = null;
  });

  return activeCall;
}

export function hangupCall() {
  if (activeCall) {
    activeCall.disconnect();
    activeCall = null;
  }
}

export function muteCall() {
  if (activeCall) activeCall.mute(true);
}

export function unmuteCall() {
  if (activeCall) activeCall.mute(false);
}
