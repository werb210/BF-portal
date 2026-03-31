import React, { createContext, useContext, useMemo } from "react";
import { clearToken, getToken, saveToken } from "@/services/token";
import { decodeJwt } from "./token";

export type AuthStatus = "loading" | "pending" | "authenticated" | "unauthenticated";
export type RolesStatus = "loading" | "ready" | "resolved";

export type AuthUser = Record<string, unknown> & {
  role?: string;
  roles?: string[];
};

export type AuthContextValue = {
  authStatus: AuthStatus;
  rolesStatus: RolesStatus;
  authReady: boolean;
  authenticated: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  user: AuthUser | null;
  role: string | null;
  roles: string[];
  hasRole: (role: string) => boolean;
  canAccessSilo: (_silo?: string | null) => boolean;
  logout: () => void;
  clearAuth: () => void;
  setAuth: (token: string) => void;
  setToken: (token: string) => void;
  startOtp: (..._args: unknown[]) => Promise<unknown>;
  loginWithOtp: (..._args: unknown[]) => Promise<unknown>;
};

export type AuthContextType = AuthContextValue;
export type AuthState = AuthContextValue;

const baseValue: AuthContextValue = {
  authStatus: "unauthenticated",
  rolesStatus: "ready",
  authReady: true,
  authenticated: false,
  isAuthenticated: false,
  isLoading: false,
  token: null,
  user: null,
  role: null,
  roles: [],
  hasRole: () => false,
  canAccessSilo: () => true,
  logout: () => {
    clearToken();
  },
  clearAuth: () => {
    clearToken();
  },
  setAuth: (token: string) => {
    saveToken(token);
  },
  setToken: (token: string) => {
    saveToken(token);
  },
  startOtp: async () => {
    throw new Error("[OTP FLOW NOT AVAILABLE]");
  },
  loginWithOtp: async () => {
    throw new Error("[OTP FLOW NOT AVAILABLE]");
  },
};

export const AuthContext = createContext<AuthContextValue>(baseValue);

const buildAuthValue = (): AuthContextValue => {
  const token = getToken();
  const decoded = token ? (decodeJwt(token) as AuthUser | null) : null;
  const roles = Array.isArray(decoded?.roles)
    ? decoded.roles.filter((item): item is string => typeof item === "string")
    : decoded?.role
      ? [String(decoded.role)]
      : [];
  const role = decoded?.role ? String(decoded.role) : roles[0] ?? null;
  const authenticated = !!token;

  return {
    ...baseValue,
    token,
    user: decoded,
    role,
    roles,
    authenticated,
    isAuthenticated: authenticated,
    authStatus: authenticated ? "authenticated" : "unauthenticated",
    hasRole: (value: string) => roles.includes(value),
  };
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const value = useMemo(() => buildAuthValue(), []);
  return React.createElement(AuthContext.Provider, { value }, children);
};

export const useAuth = (): AuthContextValue => {
  const contextValue = useContext(AuthContext);
  const runtimeValue = useMemo(() => buildAuthValue(), []);
  return contextValue ?? runtimeValue;
};
