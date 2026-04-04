import { useCallback, useEffect, useRef, useState } from "react";
import { useDialerStore } from "@/state/dialer.store";
import { safeNormalizeToE164 } from "@/utils/phone";
import { initializeTwilioVoice } from "@/services/twilioVoice";
import { logger } from "@/utils/logger";
const CALL_IN_PROGRESS_STATUSES = ["dialing", "ringing", "connected"];
const isCallInProgressStatus = (status) => CALL_IN_PROGRESS_STATUSES.includes(status);
export const useTwilioCall = () => {
    const isMock = import.meta.env.VITE_TWILIO_MODE === "mock";
    const isTest = typeof process !== "undefined" &&
        process.env.NODE_ENV === "test";
    const [deviceState, setDeviceState] = useState("unregistered");
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
    const deviceRef = useRef(null);
    const callRef = useRef(null);
    const endingRef = useRef(false);
    const classifyFailureReason = useCallback((error) => {
        if (typeof navigator !== "undefined" && !navigator.onLine)
            return "network";
        const message = error?.message?.toLowerCase() ?? "";
        if (message.includes("permission") || message.includes("denied") || message.includes("notallowed")) {
            return "permission-denied";
        }
        if (message.includes("busy") || message.includes("no answer") || message.includes("no-answer") || message.includes("declined")) {
            return "busy-no-answer";
        }
        return "unknown";
    }, []);
    const finalizeCall = useCallback((outcome, finalStatus, failureReason) => {
        if (endingRef.current)
            return;
        endingRef.current = true;
        endCall(outcome, finalStatus, failureReason);
        setMuted(false);
        setOnHold(false);
        callRef.current = null;
    }, [endCall, setMuted, setOnHold]);
    const attachCallHandlers = useCallback((call) => {
        call.on("ringing", () => setStatus("ringing"));
        call.on("accept", () => setStatus("connected"));
        call.on("disconnect", () => finalizeCall());
        call.on("cancel", () => finalizeCall("canceled", "failed", "user-canceled"));
        call.on("reject", () => finalizeCall("failed", "failed", "busy-no-answer"));
        call.on("error", (...args) => {
            const error = args[0];
            const failureReason = classifyFailureReason(error);
            setError(error?.message ?? "Call failed.");
            setStatus("failed");
            setFailureReason(failureReason);
            finalizeCall("failed", "failed", failureReason);
        });
    }, [classifyFailureReason, finalizeCall, setError, setFailureReason, setStatus]);
    const getDevice = useCallback(async () => {
        if (isTest) {
            setDeviceState("unregistered");
            return null;
        }
        if (deviceRef.current) {
            setDeviceState(deviceRef.current.state ?? "registered");
            return deviceRef.current;
        }
        const device = (await initializeTwilioVoice());
        if (!device) {
            setDeviceState("unregistered");
            return null;
        }
        device.on?.("registered", () => setDeviceState("registered"));
        device.on?.("unregistered", () => setDeviceState("unregistered"));
        device.on?.("incoming", (...args) => {
            const call = args[0];
            call.accept?.();
        });
        device.on?.("error", (...args) => {
            const error = args[0];
            logger.error("Twilio Device Error:", { error });
            setDeviceState(device.state ?? "unregistered");
        });
        deviceRef.current = device;
        setDeviceState(device.state ?? "registering");
        return device;
    }, [isTest]);
    useEffect(() => {
        if (isTest)
            return;
        void getDevice();
    }, [getDevice, isTest]);
    const dial = useCallback(async () => {
        if (!number)
            return;
        if (isCallInProgressStatus(status))
            return;
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
        endingRef.current = false;
        if (isMock) {
            startCall();
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
            startCall();
            callRef.current = connection;
            attachCallHandlers(connection);
        }
        catch (error) {
            const failureReason = classifyFailureReason(error);
            setError(error?.message ?? "Call failed to start.");
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
        }
        catch (error) {
            setError(error?.message ?? "Failed to end call.");
            const failureReason = classifyFailureReason(error);
            setFailureReason(failureReason);
            finalizeCall("failed", "failed", failureReason);
        }
    }, [classifyFailureReason, finalizeCall, setError, setFailureReason]);
    const toggleMute = useCallback(() => {
        const next = !muted;
        try {
            callRef.current?.mute?.(next);
        }
        catch {
            // ignore mute failures
        }
        setMuted(next);
    }, [muted, setMuted]);
    const toggleHold = useCallback(() => {
        const next = !onHold;
        try {
            callRef.current?.hold?.(next);
        }
        catch {
            // ignore hold failures
        }
        setOnHold(next);
    }, [onHold, setOnHold]);
    useEffect(() => {
        return () => {
            try {
                callRef.current?.disconnect?.();
            }
            catch {
                // ignore cleanup errors
            }
            try {
                deviceRef.current?.destroy?.();
            }
            catch {
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
