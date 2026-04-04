import { Device } from "twilio-client";
import { api } from "@/api";
let device = null;
export async function initTelephony() {
    const res = await api("/telephony/token", { method: "GET" });
    const token = typeof res === "object" && res !== null && "token" in res
        ? String(res.token ?? "")
        : "";
    if (!token) {
        throw new Error("Missing telephony token");
    }
    device = new Device(token, { debug: false });
    device.on("ready", () => console.log("Twilio Device ready"));
    device.on("error", (...args) => {
        const err = args[0];
        console.error("Twilio error", err.message);
    });
    device.on("incoming", (conn) => {
        console.log("Incoming call");
        // auto-accept for now (can be gated by UI)
        conn.accept();
    });
    return device;
}
export function callNumber(phone) {
    if (!device)
        throw new Error("Device not initialized");
    device.connect({ To: phone });
}
export function hangup() {
    if (!device)
        return;
    device.disconnectAll();
}
