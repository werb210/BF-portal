import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSilo } from "@/hooks/useSilo";
import { useNotificationsStore } from "@/state/notifications.store";
import { getRoleLabel, resolveUserRole } from "@/utils/roles";
import { useDialerStore } from "@/state/dialer.store";
import Button from "../ui/Button";
import BusinessUnitSelector from "@/components/BusinessUnitSelector";
import PushNotificationCta from "@/components/PushNotificationCta";
import NotificationCenter from "@/components/notifications/NotificationCenter";
import { logger } from "@/utils/logger";
import MayaStatus from "@/components/MayaStatus";
import { api } from "@/api";
const Topbar = ({ onToggleSidebar, onOpenMaya }) => {
    const { user, logout } = useAuth();
    const { silo } = useSilo();
    const unreadCount = useNotificationsStore((state) => state.notifications.filter((item) => !item.read).length);
    const openDialer = useDialerStore((state) => state.openDialer);
    const [isCenterOpen, setIsCenterOpen] = useState(false);
    const [liveCount, setLiveCount] = useState(0);
    const [leadCount, setLeadCount] = useState(0);
    const [productionStatus, setProductionStatus] = useState("checking");
    useEffect(() => {
        api("/api/crm/leads/count")
            .then((result) => setLeadCount(result.count ?? 0))
            .catch(() => setLeadCount(0));
    }, []);
    useEffect(() => {
        api("/api/_int/production-readiness")
            .then((result) => {
            logger.info("Production readiness payload", { data: result });
            setProductionStatus(result.status ?? "ok");
        })
            .catch(() => setProductionStatus("degraded"));
    }, []);
    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const result = await api("/api/support/live/count");
                setLiveCount(result.count ?? 0);
            }
            catch {
                setLiveCount(0);
            }
        }, 5000);
        return () => clearInterval(interval);
    }, []);
    return (_jsxs("header", { className: "topbar", children: [_jsxs("div", { className: "topbar__left", children: [_jsx("button", { type: "button", className: "topbar__menu-button", "aria-label": "Toggle navigation", onClick: onToggleSidebar, children: "\u2630" }), _jsx("img", { src: "/images/Header.png", alt: "Boreal Financial", className: "h-10 w-auto object-contain" }), _jsxs("div", { className: "topbar__title-stack", children: [_jsx("h1", { className: "topbar__title", children: "Boreal Financial" }), _jsxs("span", { className: "topbar__subtitle", children: ["Business Unit: ", silo] })] })] }), _jsxs("div", { className: "topbar__right", children: [_jsx(BusinessUnitSelector, {}), _jsx("button", { type: "button", className: "relative rounded border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm hover:border-slate-300", onClick: onOpenMaya, children: "Maya" }), liveCount > 0 && (_jsxs("span", { className: "rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-semibold text-white", "aria-label": "Live chat queue count", children: ["Live ", liveCount] })), _jsxs("span", { className: `rounded-full px-2 py-0.5 text-[10px] font-semibold text-white ${productionStatus === "ok" ? "bg-emerald-600" : productionStatus === "checking" ? "bg-amber-500" : "bg-red-600"}`, "aria-label": "Production readiness status", children: ["Prod: ", productionStatus] }), _jsx(MayaStatus, {}), leadCount > 0 && (_jsxs("span", { className: "rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-semibold text-white", "aria-label": "Website lead count", children: ["Leads ", leadCount] })), _jsx("button", { type: "button", className: "topbar__icon-button", "aria-label": "Open dialer", onClick: () => openDialer({ source: "global" }), children: "\u260E\uFE0E" }), _jsxs("div", { className: "relative", children: [_jsxs("button", { type: "button", className: "relative rounded border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm hover:border-slate-300", "aria-label": "Open notifications", onClick: () => setIsCenterOpen((prev) => !prev), children: ["Notifications", unreadCount > 0 && (_jsx("span", { className: "ml-2 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold text-white", children: unreadCount }))] }), isCenterOpen && _jsx(NotificationCenter, { onClose: () => setIsCenterOpen(false) })] }), _jsx(PushNotificationCta, {}), user && (_jsxs("div", { className: "topbar__user", children: [_jsxs("div", { children: [_jsx("div", { className: "topbar__user-name", children: user.name }), _jsx("div", { className: "topbar__user-role", children: getRoleLabel(resolveUserRole(user?.role ?? null)) })] }), _jsx(Button, { variant: "secondary", onClick: logout, children: "Logout" })] }))] })] }));
};
export default Topbar;
