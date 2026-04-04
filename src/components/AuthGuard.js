import { jsx as _jsx } from "react/jsx-runtime";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
export default function AuthGuard({ children }) {
    const { authStatus, authenticated } = useAuth();
    if (authStatus === "pending") {
        return _jsx("div", { children: "Loading..." });
    }
    if (!authenticated) {
        return _jsx(Navigate, { to: "/login", replace: true });
    }
    return children;
}
