import { jsx as _jsx } from "react/jsx-runtime";
// @ts-nocheck
import { getToken } from "@/auth/token";
import { Navigate } from "react-router-dom";
export default function ProtectedRoute({ children }) {
    if (!getToken()) {
        return _jsx(Navigate, { to: "/login", replace: true });
    }
    return children;
}
