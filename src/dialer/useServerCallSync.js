import { useEffect } from "react";
import { getCallStatus } from "../services/telephonyService";
import { setCallStatus } from "./callStore";
const VALID_STATUSES = new Set([
    "idle",
    "incoming",
    "ringing",
    "connecting",
    "connected",
    "ended",
    "missed",
    "voicemail"
]);
function asCallStatus(value) {
    if (typeof value !== "string")
        return null;
    return VALID_STATUSES.has(value) ? value : null;
}
export function useServerCallSync({ enabled = true } = {}) {
    useEffect(() => {
        if (!enabled)
            return;
        const interval = setInterval(async () => {
            const serverStatus = await getCallStatus();
            const activeCall = serverStatus?.activeCall ?? false;
            const status = asCallStatus(serverStatus?.status);
            if (status) {
                setCallStatus(status);
            }
            else if (!activeCall) {
                setCallStatus("idle");
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [enabled]);
}
