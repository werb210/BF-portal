import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { acceptIncoming, rejectIncoming } from "@/services/voiceService";
export default function IncomingCallModal() {
    const [call, setCall] = useState(null);
    useEffect(() => {
        const handler = (event) => {
            const customEvent = event;
            setCall(customEvent.detail);
        };
        window.addEventListener("incoming-call", handler);
        return () => window.removeEventListener("incoming-call", handler);
    }, []);
    if (!call)
        return null;
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50", children: _jsxs("div", { className: "rounded bg-white p-6 text-center shadow-lg", children: [_jsx("h2", { className: "mb-4 text-xl font-bold", children: "Incoming Call" }), _jsxs("div", { className: "flex justify-center gap-4", children: [_jsx("button", { className: "rounded bg-green-600 px-4 py-2 text-white", onClick: async () => {
                                const accepted = await acceptIncoming(call);
                                if (accepted) {
                                    setCall(null);
                                }
                            }, children: "Accept" }), _jsx("button", { className: "rounded bg-red-600 px-4 py-2 text-white", onClick: () => {
                                rejectIncoming(call);
                                setCall(null);
                            }, children: "Reject" })] })] }) }));
}
