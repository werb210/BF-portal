import { Device } from "@twilio/voice-sdk";

let device: Device | null = null;
let activeCall: any = null;

export async function bootstrapVoice(token: string) {
  device = new Device(token);

  device.on("registered", () => {
    console.log("Twilio device registered");
  });

  device.on("incoming", (call) => {
    console.log("Incoming call");

    activeCall = call;

    call.accept();
  });

  device.on("disconnect", () => {
    console.log("Call ended");

    activeCall = null;
  });

  await device.register();
}

export function dialNumber(number: string) {
  if (!device) return;

  activeCall = device.connect({
    params: {
      To: number
    }
  });
}

export function hangupCall() {
  if (activeCall) {
    activeCall.disconnect();
    activeCall = null;
  }
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
