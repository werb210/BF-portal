import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AUTH_STORAGE_KEY, clearToken, getToken } from "@/auth/token";
import { decodeJwt } from "@/auth/jwt";
import { normalizeRole } from "@/auth/roles";
const AuthContext = createContext(null);
function resolveUser(token) {
    if (!token)
        return null;
    const payload = decodeJwt(token);
    const role = normalizeRole(payload?.role ?? null);
    if (!role)
        return null;
    return {
        id: payload?.sub ?? payload?.id ?? "unknown",
        role,
        name: payload?.name,
        email: payload?.email,
    };
}
export function AuthProvider({ children }) {
    const [token, setTokenState] = useState(() => getToken());
    useEffect(() => {
        const onStorage = (event) => {
            if (event.key === AUTH_STORAGE_KEY) {
                setTokenState(getToken());
            }
        };
        window.addEventListener("storage", onStorage);
        return () => window.removeEventListener("storage", onStorage);
    }, []);
    const clearAuth = useCallback(() => {
        clearToken();
        setTokenState(null);
    }, []);
    const user = useMemo(() => resolveUser(token), [token]);
    const role = user?.role ?? null;
    const value = {
        user,
        role,
        token,
        logout: clearAuth,
        clearAuth,
        authenticated: Boolean(user),
        isAuthenticated: Boolean(user),
        authStatus: token ? (user ? "authenticated" : "unauthenticated") : "unauthenticated",
        isLoading: false,
        rolesStatus: "ready",
        authReady: true,
        canAccessSilo: () => Boolean(user),
    };
    return _jsx(AuthContext.Provider, { value: value, children: children });
}
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within AuthProvider");
    }
    return context;
}
export { AuthContext };
