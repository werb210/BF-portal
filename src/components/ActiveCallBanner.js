import { jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { getCallStatus, subscribeCallStatus } from "@/dialer/callStore";
export function ActiveCallBanner() {
    const [status, setStatus] = useState(getCallStatus());
    useEffect(() => subscribeCallStatus(setStatus), []);
    if (status === "idle" || status === "ended")
        return null;
    return _jsxs("div", { className: "call-banner p-2 text-sm font-medium", children: ["Current call status: ", status] });
}
