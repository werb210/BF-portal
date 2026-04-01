import { Device } from "twilio-client";
import { apiRequest } from "@/api/client";

let device: Device | null = null;

export async function initTelephony() {
  // expects server endpoint to return { success, data: { token } }
  const res = await apiRequest("/telephony/token", { method: "GET" });
  if (!res.success) {
    throw new Error(res.error);
  }
  const token = (typeof res.data === "object" && res.data !== null && "token" in res.data)
    ? String((res.data as { token?: string }).token ?? "")
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
