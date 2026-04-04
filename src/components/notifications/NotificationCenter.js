import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from "react";
import { useNotificationsStore } from "@/state/notifications.store";
import { getNotificationLabel } from "@/utils/notifications";
const formatTimestamp = (timestamp) => new Date(timestamp).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
});
const NotificationRow = ({ item, onMarkRead }) => (_jsxs("button", { type: "button", className: `flex w-full flex-col gap-1 rounded border px-3 py-2 text-left text-sm transition ${item.read ? "border-slate-200 bg-white" : "border-emerald-200 bg-emerald-50"}`, onClick: onMarkRead, children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsx("span", { className: "font-semibold text-slate-900", children: item.title || getNotificationLabel(item.type) }), _jsx("span", { className: "text-xs text-slate-500", children: formatTimestamp(item.createdAt) })] }), _jsx("span", { className: "text-slate-600", children: item.message }), _jsxs("span", { className: "text-xs text-slate-400", children: ["Source: ", item.source] })] }));
const NotificationCenter = ({ onClose }) => {
    const { notifications, markAllRead, clearAll, markRead } = useNotificationsStore();
    const unreadCount = useMemo(() => notifications.filter((item) => !item.read).length, [notifications]);
    return (_jsxs("div", { className: "absolute right-0 top-full z-50 mt-2 w-96 rounded border border-slate-200 bg-white shadow-lg", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-slate-200 px-4 py-3", children: [_jsxs("div", { children: [_jsx("div", { className: "text-sm font-semibold text-slate-900", children: "Notifications" }), _jsxs("div", { className: "text-xs text-slate-500", children: [unreadCount, " unread"] })] }), _jsx("button", { type: "button", className: "text-xs text-slate-500 hover:text-slate-700", onClick: onClose, children: "Close" })] }), _jsxs("div", { className: "flex items-center justify-between border-b border-slate-200 px-4 py-2 text-xs text-slate-500", children: [_jsx("button", { type: "button", className: "hover:text-slate-700", onClick: markAllRead, children: "Mark all read" }), _jsx("button", { type: "button", className: "hover:text-slate-700", onClick: clearAll, children: "Clear" })] }), _jsx("div", { className: "max-h-96 space-y-2 overflow-auto px-4 py-3", children: notifications.length === 0 ? (_jsx("p", { className: "text-sm text-slate-500", children: "No notifications yet." })) : (notifications.map((item) => (_jsx(NotificationRow, { item: item, onMarkRead: () => markRead(item.id) }, item.id)))) })] }));
};
export default NotificationCenter;
