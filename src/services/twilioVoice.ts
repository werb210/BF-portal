import { Device } from "@twilio/voice-sdk";
import { getVoiceToken } from "@/telephony/getVoiceToken";

type VoiceDevice = InstanceType<typeof Device>;

let device: VoiceDevice | null = null;

export async function fetchTwilioToken(): Promise<string> {
  const token = await getVoiceToken();
  if (!token) {
    throw new Error("Missing Twilio token");
  }
  return token;
}

export function createTwilioDevice(token: string): VoiceDevice {
  return new Device(token);
}

export async function initializeTwilioVoice() {
  if (device) return device;
  const token = await fetchTwilioToken();
  device = createTwilioDevice(token);
  await device.register?.();
  return device;
}

export function destroyTwilioVoice() {
  device?.destroy();
  device = null;
}
