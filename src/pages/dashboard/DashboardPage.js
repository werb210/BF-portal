import { jsx as _jsx } from "react/jsx-runtime";
import { Navigate } from "react-router-dom";
import RequireRole from "@/components/auth/RequireRole";
import AppLoading from "@/components/layout/AppLoading";
import { useAuth } from "@/hooks/useAuth";
import Dashboard from "@/pages/dashboard/Dashboard";
const DashboardPage = () => {
    const { isAuthenticated, isLoading, user } = useAuth();
    if (isLoading) {
        return _jsx(AppLoading, {});
    }
    if (!isAuthenticated) {
        return _jsx(Navigate, { to: "/login", replace: true });
    }
    if (!user) {
        return _jsx("div", { children: "Loading..." });
    }
    return (_jsx(RequireRole, { roles: ["Admin", "Staff", "Marketing"], children: _jsx(Dashboard, {}) }));
};
export default DashboardPage;
