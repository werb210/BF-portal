import { Device } from "@twilio/voice-sdk";

let device: Device | null = null;

export async function initTwilio() {
  const res = await fetch("https://server.boreal.financial/api/voice/token", {
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch Twilio token");
  }

  const { token } = await res.json();

  device = new Device(token, { logLevel: 1 });

  device.on("registered", () => {
    console.log("Twilio ready");
  });

  device.on("error", (err) => {
    console.error("Twilio error:", err);
  });

  await device.register();

  return device;
}

export function getDevice() {
  return device;
}
