import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
export default function RequireRole({ roles, children }) {
    const { user } = useAuth();
    if (!user)
        return _jsx(Navigate, { to: "/login", replace: true });
    if (!roles.includes(String(user.role ?? "")))
        return _jsx(Navigate, { to: "/unauthorized", replace: true });
    return _jsx(_Fragment, { children: children });
}
