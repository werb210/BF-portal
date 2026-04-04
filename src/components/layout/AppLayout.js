import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import SystemBanner from "@/components/SystemBanner";
import ApiErrorToast from "./ApiErrorToast";
import NotificationToast from "@/components/notifications/NotificationToast";
import { useNotificationPermissionPrompt } from "@/hooks/useNotificationPermissionPrompt";
import VoiceDialer from "@/components/dialer/VoiceDialer";
import DialerErrorBoundary from "@/components/dialer/DialerErrorBoundary";
import MayaPanel from "@/components/maya/MayaPanel";
import ErrorBoundary from "@/core/ErrorBoundary";
import { usePresence } from "@/hooks/usePresence";
import "@/styles/globals.css";
const AppLayout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [mayaOpen, setMayaOpen] = useState(false);
    const location = useLocation();
    useNotificationPermissionPrompt();
    usePresence();
    useEffect(() => {
        setSidebarOpen(false);
    }, [location.pathname]);
    return (_jsxs("div", { className: `app-shell ${sidebarOpen ? "app-shell--menu-open" : ""}`, children: [_jsx(Sidebar, { isOpen: sidebarOpen, onClose: () => setSidebarOpen(false) }), _jsxs("div", { className: "app-shell__content", children: [_jsx(SystemBanner, {}), _jsx(ApiErrorToast, {}), _jsx(NotificationToast, {}), _jsx(Topbar, { onToggleSidebar: () => setSidebarOpen((prev) => !prev), onOpenMaya: () => setMayaOpen(true) }), _jsx("main", { className: "app-shell__main", children: _jsx(Outlet, {}) })] }), _jsx(DialerErrorBoundary, { children: _jsx(VoiceDialer, {}) }), _jsx(ErrorBoundary, { children: _jsx(MayaPanel, { open: mayaOpen, onClose: () => setMayaOpen(false) }) }), sidebarOpen && (_jsx("button", { type: "button", className: "sidebar-overlay", "aria-label": "Close navigation", onClick: () => setSidebarOpen(false) }))] }));
};
export default AppLayout;
