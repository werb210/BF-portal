import { Device } from "@twilio/voice-sdk";
import { getVoiceToken } from "@/telephony/getVoiceToken";
let device = null;
export async function fetchTwilioToken() {
    const token = await getVoiceToken();
    if (!token) {
        throw new Error("Missing Twilio token");
    }
    return token;
}
export function createTwilioDevice(token) {
    return new Device(token);
}
export async function initializeTwilioVoice() {
    if (device)
        return device;
    const token = await fetchTwilioToken();
    device = createTwilioDevice(token);
    await device.register?.();
    return device;
}
export function destroyTwilioVoice() {
    device?.destroy();
    device = null;
}
