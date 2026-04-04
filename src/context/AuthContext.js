import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useEffect, useState } from "react";
import { getToken, setToken, clearToken } from "../lib/authToken";
const AuthContext = createContext(undefined);
export function AuthProvider({ children }) {
    const [token, setTokenState] = useState(null);
    const [isLoading, setLoading] = useState(true);
    useEffect(() => {
        const t = getToken();
        setTokenState(t);
        setLoading(false);
    }, []);
    function login(token) {
        setToken(token);
        setTokenState(token);
    }
    function logout() {
        clearToken();
        setTokenState(null);
    }
    return (_jsx(AuthContext.Provider, { value: {
            token,
            isAuthenticated: !!token,
            isLoading,
            login,
            logout,
        }, children: children }));
}
export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx)
        throw new Error("AuthContext missing");
    return ctx;
}
