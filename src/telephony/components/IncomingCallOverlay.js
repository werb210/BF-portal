import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { answerIncomingCall, declineIncomingCall } from "@/telephony/bootstrapVoice";
import { useCallState } from "../state/callState";
function getCallerLabel(call) {
    if (!call || typeof call !== "object") {
        return "Unknown caller";
    }
    const parameters = call.parameters;
    const from = parameters?.From || parameters?.Caller;
    return from || "Unknown caller";
}
export default function IncomingCallOverlay() {
    const incomingCall = useCallState(state => state.incomingCall);
    if (!incomingCall)
        return null;
    return (_jsxs("div", { className: "fixed bottom-6 right-6 z-50 w-72 rounded-lg bg-white p-4 shadow-lg", children: [_jsx("div", { className: "mb-1 font-semibold", children: "Incoming Call" }), _jsx("div", { className: "mb-3 text-sm text-slate-600", children: getCallerLabel(incomingCall) }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: answerIncomingCall, className: "flex-1 rounded bg-green-600 px-3 py-2 text-white", children: "Answer" }), _jsx("button", { onClick: declineIncomingCall, className: "flex-1 rounded bg-red-600 px-3 py-2 text-white", children: "Decline" })] })] }));
}
