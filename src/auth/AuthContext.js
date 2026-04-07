import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AUTH_STORAGE_KEY, authToken } from "@/lib/authToken";
import { decodeJwt } from "@/auth/jwt";
import { normalizeRole } from "@/auth/roles";
const AuthContext = createContext(null);
function getValidToken() {
    const token = authToken.get();
    if (!token)
        return null;
    if (token.length < 20) {
        authToken.clear();
        return null;
    }
    return token;
}
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
    const [token, setTokenState] = useState(() => getValidToken());
    useEffect(() => {
        const syncToken = () => {
            setTokenState((current) => {
                const next = getValidToken();
                return current === next ? current : next;
            });
        };
        const onStorage = (event) => {
            if (event.key === AUTH_STORAGE_KEY) {
                syncToken();
            }
        };
        window.addEventListener("storage", onStorage);
        window.addEventListener("focus", syncToken);
        document.addEventListener("visibilitychange", syncToken);
        return () => {
            window.removeEventListener("storage", onStorage);
            window.removeEventListener("focus", syncToken);
            document.removeEventListener("visibilitychange", syncToken);
        };
    }, []);
    const clearAuth = useCallback(() => {
        authToken.clear();
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
