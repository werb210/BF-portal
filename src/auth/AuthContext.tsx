import { createContext, useContext, useMemo, type ReactNode } from "react";

import { decodeJwt } from "@/auth/jwt";
import { clearToken, getToken } from "@/auth/token";
import { normalizeRole, type Role } from "@/auth/roles";

export type AuthStatus = "authenticated" | "unauthenticated" | "pending";
export type RolesStatus = "ready" | "loading";

export type AuthUser = { id: string; role: Role; name?: string; email?: string };

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

export type AuthContextType = AuthContextValue;
export type AuthState =
  | { status: "pending" }
  | { status: "unauthenticated" }
  | { status: "authenticated"; user: AuthUser };

const AuthContext = createContext<AuthContextValue | null>(null);

const buildAuthValue = (): AuthContextValue => {
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

  const payload = decodeJwt(token) as { sub?: string; id?: string; role?: string; name?: string; email?: string } | null;
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const value = useMemo(buildAuthValue, [localStorage.getItem("bf_jwt_token")]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  return context ?? buildAuthValue();
}

export { AuthContext };
