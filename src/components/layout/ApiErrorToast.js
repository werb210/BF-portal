import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from "react";
import { clearApiToast, useApiNotificationsStore } from "@/state/apiNotifications";
const ApiErrorToast = () => {
    const toast = useApiNotificationsStore((state) => state.toast);
    useEffect(() => {
        if (!toast)
            return;
        const timeout = window.setTimeout(() => {
            clearApiToast();
        }, 5000);
        return () => window.clearTimeout(timeout);
    }, [toast]);
    if (!toast)
        return null;
    return (_jsxs("div", { className: "fixed bottom-4 right-4 z-50 rounded bg-red-600 px-4 py-2 text-sm text-white shadow", role: "alert", children: [_jsx("div", { children: toast.message }), toast.requestId && _jsxs("div", { className: "text-xs opacity-80", children: ["Request ID: ", toast.requestId] })] }));
};
export default ApiErrorToast;
