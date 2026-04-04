import { jsx as _jsx } from "react/jsx-runtime";
import { Navigate, useLocation } from "react-router-dom";
import { clearAuth, getAccessToken, isTokenExpired } from "@/lib/authStorage";
export default function AuthGuard({ children }) {
    const location = useLocation();
    const token = getAccessToken();
    if (!token) {
        return _jsx(Navigate, { to: "/login", replace: true, state: { from: location } });
    }
    if (isTokenExpired(token)) {
        clearAuth();
        return _jsx(Navigate, { to: "/login", replace: true, state: { from: location } });
    }
    return children;
}
