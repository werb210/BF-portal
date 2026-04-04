import { jsx as _jsx } from "react/jsx-runtime";
// @ts-nocheck
import { Navigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
export default function ProtectedRoute({ children }) {
    const { authStatus, token } = useAuth();
    if (authStatus === "pending") {
        return null;
    }
    if (token) {
        return children;
    }
    if (authStatus === "unauthenticated") {
        return _jsx(Navigate, { to: "/login", replace: true });
    }
    return null;
}
