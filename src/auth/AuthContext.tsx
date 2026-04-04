import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { AUTH_STORAGE_KEY, clearToken, getToken } from "@/auth/token";
import { decodeJwt } from "@/auth/jwt";
import { normalizeRole, type Role } from "@/auth/roles";

export type AuthStatus = "authenticated" | "unauthenticated" | "pending";
export type RolesStatus = "ready" | "loading";

export type AuthUser = { id: string; role: Role; name?: string; email?: string };

export type AuthContextType = AuthContextValue;
export type AuthState =
  | { status: "pending" }
  | { status: "unauthenticated" }
  | { status: "authenticated"; user: AuthUser };

export type AuthContextValue = {
  user: AuthUser | null;
  role: Role | null;
  token: string | null;
  logout: () => void;
  clearAuth: () => void;
  authenticated: boolean;
  isAuthenticated: boolean;
  authStatus: AuthStatus;
  isLoading: boolean;
  rolesStatus: RolesStatus;
  authReady: boolean;
  canAccessSilo: (_silo?: string | null) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function resolveUser(token: string | null): AuthUser | null {
  if (!token) return null;
  const payload = decodeJwt(token) as { sub?: string; id?: string; role?: string; name?: string; email?: string } | null;
  const role = normalizeRole(payload?.role ?? null);
  if (!role) return null;
  return {
    id: payload?.sub ?? payload?.id ?? "unknown",
    role,
    name: payload?.name,
    email: payload?.email,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => getToken());

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
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

  const value: AuthContextValue = {
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

export { AuthContext };
