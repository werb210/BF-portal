import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useRef } from "react";
import { useDialerStore } from "@/state/dialer.store";
import { safeNormalizeToE164 } from "@/utils/phone";
import { createTwilioDevice, fetchTwilioToken } from "@/services/twilioVoice";
const statusLabel = {
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
    const { isOpen, number, status, error, setNumber, closeDialer, setStatus, setError, setFailureReason, setDialedNumber, startCall, endCall, resetCall, registerDialAttempt } = useDialerStore();
    const deviceRef = useRef(null);
    const callInProgress = status === "dialing" || status === "ringing" || status === "connected";
    const canDial = Boolean(number.trim()) && !callInProgress;
    const statusText = useMemo(() => statusLabel[status] ?? "Ready", [status]);
    if (!isOpen)
        return null;
    const classifyAndFail = (message) => {
        const lowered = message.toLowerCase();
        if (lowered.includes("permission") || lowered.includes("denied")) {
            setFailureReason("permission-denied");
            setError("Microphone permission denied.");
        }
        else {
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
            call.on("error", (...args) => {
                const err = args[0];
                classifyAndFail(err?.message ?? "Call failed.");
            });
        }
        catch (err) {
            classifyAndFail(err?.message ?? "Call failed.");
        }
    };
    return (_jsxs("div", { "data-testid": "voice-dialer", className: "dialer", children: [_jsx("div", { className: "dialer__status-pill", children: statusText }), _jsx("input", { type: "tel", placeholder: "Enter phone number", value: number, onChange: (event) => setNumber(event.target.value) }), error ? _jsx("div", { children: error }) : null, _jsx("button", { type: "button", onClick: onDial, disabled: !canDial, children: "Dial" }), _jsx("button", { type: "button", onClick: () => { closeDialer(); resetCall(); }, children: "Close dialer" })] }));
}
