import { Device } from "@twilio/voice-sdk";
import { getVoiceToken } from "@/telephony/getVoiceToken";

let device: Device | null = null;

export async function initializeVoice(identity: string) {
  void identity;
  const token = await getVoiceToken();
  device = new Device(token);

  device.on("registered", () => {
    console.log("Twilio device ready");
  });

  await device.register();
  return device;
}

export function getDevice() {
  return device;
}

export async function destroyVoiceClient() {
  if (device) {
    device.destroy();
    device = null;
  }
}
