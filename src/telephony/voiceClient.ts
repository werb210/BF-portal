import { Device } from "@twilio/voice-sdk";
import apiClient from "@/api/client";

let device: Device | null = null;

export async function initializeVoice(identity: string) {
  const { data } = await apiClient.post("/api/telephony/token", { identity });
  device = new Device(data.token);

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
