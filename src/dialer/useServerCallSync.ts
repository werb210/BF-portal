import { useEffect } from "react";
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

function resolveApiUrl(path: string): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return new URL(path, window.location.origin).toString();
  }

  return path;
}

function asCallStatus(value: unknown): CallStatus | null {
  if (typeof value !== "string") return null;
  return VALID_STATUSES.has(value as CallStatus) ? (value as CallStatus) : null;
}

export function useServerCallSync(): void {
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(resolveApiUrl("/api/call/status"), {
          credentials: "include"
        });

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
  }, []);
}
