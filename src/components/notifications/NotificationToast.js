import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from "react";
import { useNotificationsStore } from "@/state/notifications.store";
const NotificationToast = () => {
    const { toast, clearToast, markRead } = useNotificationsStore();
    useEffect(() => {
        if (!toast)
            return;
        const timeout = window.setTimeout(() => {
            markRead(toast.id);
            clearToast();
        }, 6000);
        return () => window.clearTimeout(timeout);
    }, [clearToast, markRead, toast]);
    if (!toast)
        return null;
    return (_jsxs("div", { className: "fixed bottom-4 right-4 z-50 w-80 rounded border border-slate-200 bg-white px-4 py-3 text-sm shadow", role: "status", "data-testid": "notification-toast", children: [_jsx("div", { className: "text-xs uppercase tracking-wide text-emerald-600", children: toast.type }), _jsx("div", { className: "font-semibold text-slate-900", children: toast.title }), _jsx("div", { className: "text-slate-600", children: toast.message }), _jsxs("div", { className: "mt-2 flex items-center justify-between text-xs text-slate-500", children: [_jsx("span", { children: toast.source === "push" ? "Push" : "In-app" }), _jsx("button", { type: "button", className: "text-slate-500 hover:text-slate-700", onClick: () => {
                            markRead(toast.id);
                            clearToast();
                        }, children: "Dismiss" })] })] }));
};
export default NotificationToast;
