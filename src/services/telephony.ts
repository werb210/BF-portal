import { Device } from "twilio-client";
import { apiClient } from "@/lib/apiClient";

let device: Device | null = null;

export async function initTelephony() {
    const res = await apiClient<{ token?: string }>("/telephony/token", { method: "GET" });
  const token = typeof res === "object" && res !== null && "token" in res
    ? String((res as { token?: string }).token ?? "")
    : "";

  if (!token) {
    throw new Error("Missing telephony token");
  }

  device = new Device(token, { debug: false });

  device.on("ready", () => console.log("Twilio Device ready"));
  device.on("error", (e: unknown) => console.error("Twilio error", e));
  device.on("incoming", (conn: { accept: () => void }) => {
    console.log("Incoming call");
    // auto-accept for now (can be gated by UI)
    conn.accept();
  });

  return device;
}

export function callNumber(phone: string) {
  if (!device) throw new Error("Device not initialized");
  device.connect({ To: phone });
}

export function hangup() {
  if (!device) return;
  device.disconnectAll();
}
