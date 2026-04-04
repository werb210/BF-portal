import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
// @ts-nocheck
import { Suspense, lazy, useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Navigate, Outlet, Route, Routes, useInRouterContext } from "react-router-dom";
import { roleIn } from "@/auth/roles";
import { usePortalSessionGuard } from "@/auth/portalSessionGuard";
import IncomingCallModal from "@/components/IncomingCallModal";
import { ActiveCallBanner } from "@/components/ActiveCallBanner";
import ProtectedRoute from "@/routes/ProtectedRoute";
import RequireRole from "@/components/auth/RequireRole";
import { useServerCallSync } from "@/dialer/useServerCallSync";
import { bootstrapVoice, destroyVoiceDevice } from "@/telephony/bootstrapVoice";
import LoginPage from "@/pages/LoginPage";
import AuthOtpPage from "@/pages/AuthOtpPage";
import DashboardPage from "@/pages/dashboard/DashboardPage";
import LendersPage from "@/pages/Lenders";
import PipelinePage from "@/pages/pipeline/PipelinePage";
import ApplicationDetail from "@/pages/application/ApplicationDetail";
import MayaPage from "@/pages/MayaPage";
import ApplyPage from "@/pages/ApplyPage";
import { useAuth } from "@/auth/AuthContext";
import ToastProvider from "@/components/ui/ToastProvider";
import DialerButton from "@/components/DialerButton";
import MobileShell from "@/mobile/MobileShell";
import IncomingCallOverlay from "./telephony/components/IncomingCallOverlay";
import PortalDialer from "./telephony/components/PortalDialer";
import ErrorBoundary from "@/components/system/ErrorBoundary";
import { queryClient } from "@/lib/queryClient";
function SessionGuard() {
    usePortalSessionGuard();
    return null;
}
function VoiceBootstrap() {
    const { role, authenticated, authStatus } = useAuth();
    useEffect(() => {
        if (process.env.NODE_ENV === "test")
            return;
        if (!authenticated || authStatus !== "authenticated")
            return;
        if (!roleIn(role, ["Admin", "Staff"]))
            return;
        void bootstrapVoice().catch(() => {
            // bootstrapVoice writes a user-facing error state.
        });
        return () => {
            void destroyVoiceDevice();
        };
    }, [authenticated, authStatus, role]);
    return null;
}
function ServerCallSyncBootstrap() {
    const { authenticated, authStatus } = useAuth();
    useServerCallSync({ enabled: authenticated && authStatus === "authenticated" });
    return null;
}
function AppShell() {
    return (_jsxs(_Fragment, { children: [_jsx(SessionGuard, {}), _jsx(VoiceBootstrap, {}), _jsx(ServerCallSyncBootstrap, {}), _jsx(ActiveCallBanner, {}), _jsx(IncomingCallModal, {}), _jsx(DialerButton, {}), _jsx(PortalDialer, {}), _jsx(IncomingCallOverlay, {}), _jsx(MobileShell, { children: _jsx(Outlet, {}) })] }));
}
function AuthenticatedShell() {
    return _jsx(AppShell, {});
}
const FloatingChat = lazy(() => import("./components/FloatingChat"));
const AppRoutes = () => (_jsx(_Fragment, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: _jsx(LoginPage, {}) }), _jsx(Route, { path: "/auth/otp", element: _jsx(AuthOtpPage, {}) }), _jsx(Route, { path: "/otp", element: _jsx(AuthOtpPage, {}) }), _jsxs(Route, { element: _jsx(AuthenticatedShell, {}), children: [_jsx(Route, { path: "/", element: _jsx(Navigate, { to: "/login", replace: true }) }), _jsx(Route, { path: "/portal", element: _jsx(ProtectedRoute, { children: _jsx(DashboardPage, {}) }) }), _jsx(Route, { path: "/dashboard", element: _jsx(Navigate, { to: "/portal", replace: true }) }), _jsx(Route, { path: "/pipeline", element: _jsx(ProtectedRoute, { children: _jsx(RequireRole, { roles: ["Admin", "Staff", "Marketing"], children: _jsx(PipelinePage, {}) }) }) }), _jsx(Route, { path: "/applications/:id", element: _jsx(ProtectedRoute, { children: _jsx(ApplicationDetail, {}) }) }), _jsx(Route, { path: "/lenders/*", element: _jsx(ProtectedRoute, { children: _jsx(LendersPage, {}) }) }), _jsx(Route, { path: "/reports", element: _jsx(ProtectedRoute, { children: _jsx(RequireRole, { roles: ["Admin", "Staff", "Marketing"], children: _jsx("div", { children: "Reports" }) }) }) }), _jsx(Route, { path: "/maya", element: _jsx(ProtectedRoute, { children: _jsx(MayaPage, {}) }) }), _jsx(Route, { path: "/apply", element: _jsx(ApplyPage, {}) })] })] }) }));
export default function App() {
    const inRouterContext = useInRouterContext();
    const withOptionalRouter = (children) => {
        if (inRouterContext)
            return children;
        const path = typeof window !== "undefined" ? window.location.pathname || "/" : "/";
        return _jsx(MemoryRouter, { initialEntries: [path], children: children });
    };
    return withOptionalRouter(_jsx(QueryClientProvider, { client: queryClient, children: _jsxs(ToastProvider, { children: [_jsx(ErrorBoundary, { children: _jsx(AppRoutes, {}) }), _jsx(Suspense, { fallback: null, children: _jsx(FloatingChat, {}) })] }) }));
}
