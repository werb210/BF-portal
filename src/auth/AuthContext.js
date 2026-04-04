import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useMemo } from "react";
import { decodeJwt } from "@/auth/jwt";
import { clearToken, getToken } from "@/auth/token";
import { normalizeRole } from "@/auth/roles";
const AuthContext = createContext(null);
const buildAuthValue = () => {
    const token = getToken();
    if (!token) {
        return {
            user: null,
            role: null,
            token: null,
            logout: clearToken,
            clearAuth: clearToken,
            authenticated: false,
            isAuthenticated: false,
            authStatus: "unauthenticated",
            isLoading: false,
            rolesStatus: "ready",
            authReady: true,
            canAccessSilo: () => false,
        };
    }
    const payload = decodeJwt(token);
    const role = normalizeRole(payload?.role ?? null);
    const user = role
        ? {
            id: payload?.sub ?? payload?.id ?? "unknown",
            role,
            name: payload?.name,
            email: payload?.email,
        }
        : null;
    const clearAuth = () => {
        clearToken();
    };
    return {
        user,
        role,
        token,
        logout: clearAuth,
        clearAuth,
        authenticated: Boolean(user),
        isAuthenticated: Boolean(user),
        authStatus: user ? "authenticated" : "unauthenticated",
        isLoading: false,
        rolesStatus: "ready",
        authReady: true,
        canAccessSilo: () => Boolean(user),
    };
};
export function AuthProvider({ children }) {
    const value = useMemo(buildAuthValue, [localStorage.getItem("bf_jwt_token")]);
    return _jsx(AuthContext.Provider, { value: value, children: children });
}
export function useAuth() {
    const context = useContext(AuthContext);
    return context ?? buildAuthValue();
}
export { AuthContext };
