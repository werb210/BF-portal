import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useSilo } from "../context/SiloContext";
import AccessRestricted from "./auth/AccessRestricted";
import { roleIn } from "@/auth/roles";
export default function ProtectedRoute({ children, requiredRole }) {
    const { role, canAccessSilo, authStatus, token } = useAuth();
    const { silo: currentSilo } = useSilo();
    if (authStatus === "pending")
        return null;
    if (!token && authStatus === "unauthenticated")
        return _jsx(Navigate, { to: "/login", replace: true });
    if (!role)
        return _jsx("div", { children: "Unauthorized" });
    if (!canAccessSilo(currentSilo)) {
        return _jsx(AccessRestricted, { message: "You cannot access this silo." });
    }
    if (requiredRole && !roleIn(role, [requiredRole])) {
        return _jsx(AccessRestricted, { message: "Role requirements were not met." });
    }
    return _jsx(_Fragment, { children: children });
}
