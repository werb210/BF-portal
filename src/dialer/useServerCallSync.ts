import { useEffect } from "react";
import { getCallStatus } from "../services/telephonyService";
import { setCallStatus, type CallStatus } from "./callStore";

const VALID_STATUSES: ReadonlySet<CallStatus> = new Set([
  "idle",
  "incoming",
  "ringing",
  "connecting",
  "connected",
  "ended",
  "missed",
  "voicemail"
]);

type ServerCallSyncOptions = {
  enabled?: boolean;
};

function asCallStatus(value: unknown): CallStatus | null {
  if (typeof value !== "string") return null;
  return VALID_STATUSES.has(value as CallStatus) ? (value as CallStatus) : null;
}

export function useServerCallSync({ enabled = true }: ServerCallSyncOptions = {}): void {
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(async () => {
      const serverStatus = (await getCallStatus()) as { status?: unknown; activeCall?: unknown };
      const activeCall = serverStatus?.activeCall ?? false;

      if (!serverStatus || typeof serverStatus !== "object") {
        if (!activeCall) {
          setCallStatus("idle");
        }
        return;
      }

      const status = asCallStatus(serverStatus.status);
      if (status) {
        setCallStatus(status);
      } else if (!activeCall) {
        setCallStatus("idle");
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [enabled]);
}
