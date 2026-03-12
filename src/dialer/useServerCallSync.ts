import { useEffect } from "react";
import { withApiBase } from "@/lib/apiBase";
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
      try {
        const res = await fetch(withApiBase("/api/telephony/call-status"), {
          credentials: "include"
        });

        if (res.status === 404) {
          return;
        }

        if (!res.ok) return;

        const data = (await res.json()) as { status?: unknown };
        const status = asCallStatus(data.status);
        if (status) {
          setCallStatus(status);
        }
      } catch {
        // Ignore network sync failures; next poll will retry.
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [enabled]);
}
