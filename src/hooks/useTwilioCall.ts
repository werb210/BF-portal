import { useCallback, useEffect, useRef, useState } from "react";
import { useDialerStore, type DialerStatus } from "@/state/dialer.store";
import { safeNormalizeToE164 } from "@/utils/phone";
import { initializeTwilioVoice } from "@/services/twilioVoice";
import { logger } from "@/utils/logger";

type VoiceCallEvent = "ringing" | "accept" | "disconnect" | "cancel" | "reject" | "error";

type VoiceCall = {
  on: (event: VoiceCallEvent, handler: (...args: any[]) => void) => void;
  off?: (event: VoiceCallEvent, handler: (...args: any[]) => void) => void;
  accept?: () => void;
  disconnect?: () => void;
  mute?: (muted: boolean) => void;
  hold?: (held: boolean) => void;
};

type VoiceDevice = {
  connect: (options: { params: Record<string, string> }) => VoiceCall | Promise<VoiceCall>;
  register?: () => void;
  destroy?: () => void;
  state?: string;
  on?: (event: string, handler: (...args: any[]) => void) => void;
  off?: (event: string, handler: (...args: any[]) => void) => void;
};

const CALL_IN_PROGRESS_STATUSES = ["dialing", "ringing", "connected"] as const;
const isCallInProgressStatus = (status: DialerStatus) =>
  CALL_IN_PROGRESS_STATUSES.includes(status as (typeof CALL_IN_PROGRESS_STATUSES)[number]);

export const useTwilioCall = () => {
  const isMock = import.meta.env.VITE_TWILIO_MODE === "mock";
  const isTest =
    typeof process !== "undefined" &&
    process.env.NODE_ENV === "test";
  const [deviceState, setDeviceState] = useState<string>("unregistered");
  const status = useDialerStore((state) => state.status);
  const number = useDialerStore((state) => state.number);
  const muted = useDialerStore((state) => state.muted);
  const onHold = useDialerStore((state) => state.onHold);
  const startCall = useDialerStore((state) => state.startCall);
  const setStatus = useDialerStore((state) => state.setStatus);
  const endCall = useDialerStore((state) => state.endCall);
  const setError = useDialerStore((state) => state.setError);
  const setDialedNumber = useDialerStore((state) => state.setDialedNumber);
  const setMuted = useDialerStore((state) => state.setMuted);
  const setOnHold = useDialerStore((state) => state.setOnHold);
  const setFailureReason = useDialerStore((state) => state.setFailureReason);
  const registerDialAttempt = useDialerStore((state) => state.registerDialAttempt);

  const deviceRef = useRef<VoiceDevice | null>(null);
  const callRef = useRef<VoiceCall | null>(null);
  const endingRef = useRef(false);

  const classifyFailureReason = useCallback((error?: Error | null) => {
    if (typeof navigator !== "undefined" && !navigator.onLine) return "network";
    const message = error?.message?.toLowerCase() ?? "";
    if (message.includes("permission") || message.includes("denied") || message.includes("notallowed")) {
      return "permission-denied";
    }
    if (message.includes("busy") || message.includes("no answer") || message.includes("no-answer") || message.includes("declined")) {
      return "busy-no-answer";
    }
    return "unknown";
  }, []);

  const finalizeCall = useCallback(
    (
      outcome?: "completed" | "voicemail" | "no-answer" | "failed" | "canceled",
      finalStatus?: "ended" | "failed" | "completed" | "voicemail",
      failureReason?: "network" | "permission-denied" | "busy-no-answer" | "user-canceled" | "unknown"
    ) => {
      if (endingRef.current) return;
      endingRef.current = true;
      endCall(outcome, finalStatus, failureReason);
      setMuted(false);
      setOnHold(false);
      callRef.current = null;
    },
    [endCall, setMuted, setOnHold]
  );

  const attachCallHandlers = useCallback(
    (call: VoiceCall) => {
      call.on("ringing", () => setStatus("ringing"));
      call.on("accept", () => setStatus("connected"));
      call.on("disconnect", () => finalizeCall());
      call.on("cancel", () => finalizeCall("canceled", "failed", "user-canceled"));
      call.on("reject", () => finalizeCall("failed", "failed", "busy-no-answer"));
      call.on("error", (error: Error) => {
        const failureReason = classifyFailureReason(error);
        setError(error?.message ?? "Call failed.");
        setStatus("failed");
        setFailureReason(failureReason);
        finalizeCall("failed", "failed", failureReason);
      });
    },
    [classifyFailureReason, finalizeCall, setError, setFailureReason, setStatus]
  );

  const getDevice = useCallback(async () => {
    if (isTest) {
      setDeviceState("unregistered");
      return null;
    }

    if (deviceRef.current) {
      setDeviceState((deviceRef.current.state as string) ?? "registered");
      return deviceRef.current;
    }

    const device = (await initializeTwilioVoice()) as VoiceDevice | null;
    if (!device) {
      setDeviceState("unregistered");
      return null;
    }


    device.on?.("registered", () => setDeviceState("registered"));
    device.on?.("unregistered", () => setDeviceState("unregistered"));
    device.on?.("incoming", (call: VoiceCall) => {
      call.accept?.();
    });
    device.on?.("error", (error: Error) => {
      logger.error("Twilio Device Error:", { error });
      setDeviceState((device.state as string) ?? "unregistered");
    });

    deviceRef.current = device;
    setDeviceState((device.state as string) ?? "registering");
    return device;
  }, [isTest]);

  useEffect(() => {
    if (isTest) return;

    void getDevice();
  }, [getDevice, isTest]);

  const dial = useCallback(async () => {
    if (!number) return;
    if (isCallInProgressStatus(status)) return;
    const normalized = safeNormalizeToE164(number);
    if (!normalized) {
      setError("Enter a valid phone number before dialing.");
      setStatus("failed");
      return;
    }
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setError("You are offline. Connect to the internet to place calls.");
      setStatus("failed");
      setFailureReason("network");
      return;
    }
    registerDialAttempt(normalized);
    setDialedNumber(normalized);
    setError(null);
    setFailureReason(null);
    startCall();
    endingRef.current = false;

    if (isMock) {
      finalizeCall("completed", "completed");
      return;
    }

    try {
      const device = await getDevice();
      if (!device) {
        setError("Calling is currently unavailable.");
        setStatus("failed");
        setFailureReason("unknown");
        return;
      }
      const connection = await device.connect({ params: { To: normalized } });
      callRef.current = connection;
      attachCallHandlers(connection);
    } catch (error) {
      const failureReason = classifyFailureReason(error as Error);
      setError((error as Error)?.message ?? "Call failed to start.");
      setStatus("failed");
      setFailureReason(failureReason);
      finalizeCall("failed", "failed", failureReason);
    }
  }, [
    attachCallHandlers,
    classifyFailureReason,
    finalizeCall,
    getDevice,
    isMock,
    number,
    registerDialAttempt,
    setDialedNumber,
    setError,
    setFailureReason,
    setStatus,
    startCall,
    status
  ]);

  const hangup = useCallback(() => {
    if (!callRef.current) {
      finalizeCall("canceled", "failed", "user-canceled");
      return;
    }
    try {
      callRef.current.disconnect?.();
    } catch (error) {
      setError((error as Error)?.message ?? "Failed to end call.");
      const failureReason = classifyFailureReason(error as Error);
      setFailureReason(failureReason);
      finalizeCall("failed", "failed", failureReason);
    }
  }, [classifyFailureReason, finalizeCall, setError, setFailureReason]);

  const toggleMute = useCallback(() => {
    const next = !muted;
    try {
      callRef.current?.mute?.(next);
    } catch {
      // ignore mute failures
    }
    setMuted(next);
  }, [muted, setMuted]);

  const toggleHold = useCallback(() => {
    const next = !onHold;
    try {
      callRef.current?.hold?.(next);
    } catch {
      // ignore hold failures
    }
    setOnHold(next);
  }, [onHold, setOnHold]);

  useEffect(() => {
    return () => {
      try {
        callRef.current?.disconnect?.();
      } catch {
        // ignore cleanup errors
      }
      try {
        deviceRef.current?.destroy?.();
      } catch {
        // ignore cleanup errors
      }
    };
  }, []);

  return {
    dial,
    hangup,
    toggleMute,
    toggleHold,
    deviceState
  };
};
