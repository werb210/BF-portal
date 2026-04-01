import { useMemo, useRef } from "react";
import { useDialerStore } from "@/state/dialer.store";
import { safeNormalizeToE164 } from "@/utils/phone";
import { createTwilioDevice, fetchTwilioToken } from "@/services/twilioVoice";

type VoiceCall = {
  on: (event: "ringing" | "accept" | "disconnect" | "cancel" | "reject" | "error", handler: (...args: unknown[]) => void) => void;
  disconnect?: () => void;
};

type VoiceDevice = {
  connect: (options: { params: Record<string, string> }) => Promise<VoiceCall> | VoiceCall;
};

const statusLabel: Record<string, string> = {
  idle: "Ready",
  dialing: "Dialing…",
  ringing: "Ringing…",
  connected: "Connected",
  completed: "Completed",
  failed: "Failed",
  voicemail: "Voicemail",
  ended: "Ended"
};

export default function VoiceDialer() {
  const {
    isOpen,
    number,
    status,
    error,
    setNumber,
    closeDialer,
    setStatus,
    setError,
    setFailureReason,
    setDialedNumber,
    startCall,
    endCall,
    resetCall,
    registerDialAttempt
  } = useDialerStore();
  const deviceRef = useRef<VoiceDevice | null>(null);

  const callInProgress = status === "dialing" || status === "ringing" || status === "connected";
  const canDial = Boolean(number.trim()) && !callInProgress;
  const statusText = useMemo(() => statusLabel[status] ?? "Ready", [status]);

  if (!isOpen) return null;

  const classifyAndFail = (message: string) => {
    const lowered = message.toLowerCase();
    if (lowered.includes("permission") || lowered.includes("denied")) {
      setFailureReason("permission-denied");
      setError("Microphone permission denied.");
    } else {
      setFailureReason("unknown");
      setError(message || "Call failed.");
    }
    setStatus("failed");
    endCall("failed", "failed");
  };

  const onDial = async () => {
    const normalized = safeNormalizeToE164(number);
    if (!normalized) {
      setError("Enter a valid phone number before dialing.");
      setStatus("failed");
      return;
    }

    registerDialAttempt(normalized);
    setDialedNumber(normalized);
    setError(null);
    setFailureReason(null);

    try {
      if (!deviceRef.current) {
        const token = await fetchTwilioToken();
        deviceRef.current = createTwilioDevice(token);
      }
      const call = await deviceRef.current.connect({ params: { To: normalized } });
      startCall();
      call.on("ringing", () => setStatus("ringing"));
      call.on("accept", () => setStatus("connected"));
      call.on("disconnect", () => endCall("completed", "completed"));
      call.on("cancel", () => endCall("canceled", "failed", "user-canceled"));
      call.on("reject", () => endCall("failed", "failed", "busy-no-answer"));
      call.on("error", (err: Error) => classifyAndFail(err.message));
    } catch (err) {
      classifyAndFail((err as Error)?.message ?? "Call failed.");
    }
  };

  return (
    <div data-testid="voice-dialer" className="dialer">
      <div className="dialer__status-pill">{statusText}</div>
      <input
        type="tel"
        placeholder="Enter phone number"
        value={number}
        onChange={(event) => setNumber(event.target.value)}
      />
      {error ? <div>{error}</div> : null}
      <button type="button" onClick={onDial} disabled={!canDial}>Dial</button>
      <button type="button" onClick={() => { closeDialer(); resetCall(); }}>Close dialer</button>
    </div>
  );
}
