import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import api from "@/lib/api";
import { getMe } from "@/api/auth";
import * as authService from "@/services/auth";
import { destroyVoice } from "@/services/voiceService";
import { setCallStatus } from "@/dialer/callStore";
import {
  clearStoredAuth,
  getStoredAccessToken,
  setStoredAccessToken,
  setStoredUser,
} from "@/services/token";
import type { AuthenticatedUser } from "@/services/auth";
import { normalizeRole, roleIn, type Role } from "@/auth/roles";
import { useDialerStore } from "@/state/dialer.store";
import { clearSession, writeSession } from "@/utils/sessionStore";
import { clearToken, getToken, setToken } from "@/lib/auth";

export type AuthStatus = "idle" | "pending" | "loading" | "authenticated" | "unauthenticated";
export type RolesStatus = "pending" | "loading" | "resolved" | "ready";
export type AuthState = "loading" | "authenticated" | "unauthenticated";

export type AuthUser = (AuthenticatedUser & {
  id?: string;
  phone?: string;
  role?: string;
  capabilities?: string[];
  roles?: string[];
}) | null;

type TestAuthOverride = {
  isAuthenticated?: boolean;
  role?: string;
};

declare global {
  interface Window {
    __TEST_AUTH__?: TestAuthOverride;
  }
}

export type OtpStartPayload = { phone: string };
export type OtpVerifyPayload = { phone: string; code: string };
export type OtpVerifyResult = { success: boolean; nextPath?: string; error?: string; token?: string; user?: AuthUser };

export type AuthContextValue = {
  authState: AuthState;
  status: AuthStatus;
  authStatus: AuthStatus;
  rolesStatus: RolesStatus;
  user: AuthUser;
  accessToken: string | null;
  token: string | null;
  allowedSilos: string[];
  canAccessSilo: (silo: string) => boolean;
  canAccessRole: (roles: Role[]) => boolean;
  role: Role | null;
  roles: Role[];
  capabilities: string[];
  error: string | null;
  pendingPhoneNumber: string | null;
  authenticated: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  authReady: boolean;
  isHydratingSession: boolean;
  login: () => Promise<boolean>;
  startOtp: (payload: OtpStartPayload) => Promise<boolean>;
  verifyOtp: (phone: string, code: string) => Promise<OtpVerifyResult>;
  loginWithOtp: (phone: string, code: string) => Promise<OtpVerifyResult>;
  refreshUser: (tokenOverride?: string | null, options?: { deferHydrationEnd?: boolean }) => Promise<boolean>;
  clearAuth: () => void;
  logout: () => Promise<void>;
  setAuth: (user: AuthUser) => void;
  setUser: (user: AuthUser) => void;
  setAuthenticated: (authenticated: boolean) => void;
  setAuthState: (state: AuthState) => void;
};

export type AuthContextType = AuthContextValue;

const normalizeUserRoles = (user: AuthUser): Role[] => {
  if (!user) return [];
  const source = Array.isArray(user.roles) && user.roles.length ? user.roles : user.role ? [user.role] : [];
  return source
    .map((entry: string) => normalizeRole(entry))
    .filter((entry: Role | null): entry is Role => entry !== null);
};

const normalizeAuthUser = (user: AuthUser): AuthUser => {
  if (!user) return null;
  const role = normalizeRole(user.role ?? null);
  return {
    ...user,
    role: role ?? undefined,
    roles: normalizeUserRoles(user),
  };
};

const hasResolvedRole = (user: AuthUser) => Boolean(user?.role);

const resolveAuthUserFromResponse = (payload: unknown): AuthUser => {
  if (!payload || typeof payload !== "object") return null;

  const candidate = payload as {
    user?: AuthUser;
    data?: { user?: AuthUser };
  };

  const resolved = candidate?.data?.user ?? candidate?.user ?? (payload as AuthUser);

  if (!resolved || typeof resolved !== "object") return null;
  const hasIdentity = typeof resolved.id === "string" || typeof resolved.phone === "string";
  if (!hasIdentity) return null;

  return normalizeAuthUser(resolved);
};


const isTestMode = () => process.env.NODE_ENV === "test";

const getTestAuthOverride = (): TestAuthOverride | null => {
  if (!isTestMode() || typeof window === "undefined") return null;
  const override = window.__TEST_AUTH__;
  if (override && typeof override === "object") return override;

  const path = window.location.pathname;
  if (path.startsWith("/lenders")) {
    return { isAuthenticated: true, role: "Admin" };
  }

  return null;
};

/**
 * IMPORTANT:
 * Tests that render without a Provider MUST NOT auto-authenticate.
 * Otherwise /login redirects and smoke tests cannot find the "Staff Login" heading.
 */
const clearInvalidTokenArtifacts = () => {
  clearStoredAuth();
  clearToken();
  delete api.defaults.headers.common["Authorization"];
};

const getErrorStatus = (error: unknown): number | undefined => {
  if (!error || typeof error !== "object") return undefined;
  if ("status" in error && typeof (error as { status?: unknown }).status === "number") {
    return (error as { status: number }).status;
  }
  if ("response" in error) {
    const status = (error as { response?: { status?: unknown } }).response?.status;
    return typeof status === "number" ? status : undefined;
  }
  return undefined;
};


const isUnauthorizedError = (error: unknown) => getErrorStatus(error) === 401;

const destroyDevice = destroyVoice;

const TEST_AUTH_STUB: AuthContextValue = {
  authState: "unauthenticated",
  status: "unauthenticated",
  authStatus: "unauthenticated",
  rolesStatus: "resolved",
  user: null,
  accessToken: null,
  token: null,
  allowedSilos: [],
  canAccessSilo: () => true,
  canAccessRole: () => false,
  role: null,
  roles: [],
  capabilities: [],
  error: null,
  pendingPhoneNumber: null,
  authenticated: false,
  isAuthenticated: false,
  isLoading: false,
  authReady: true,
  isHydratingSession: false,
  login: async () => false,
  startOtp: async () => true,
  verifyOtp: async () => ({ success: true }),
  loginWithOtp: async () => ({ success: true }),
  refreshUser: async () => true,
  clearAuth: () => undefined,
  logout: async () => {
    localStorage.removeItem("persist");
    sessionStorage.removeItem("persist");
  },
  setAuth: () => undefined,
  setUser: () => undefined,
  setAuthenticated: () => undefined,
  setAuthState: () => undefined,
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUserState] = useState<AuthUser>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [authState, setAuthStateState] = useState<AuthState>("loading");
  const [authStatus, setAuthStatus] = useState<AuthStatus>("loading");
  const [rolesStatus, setRolesStatus] = useState<RolesStatus>("loading");
  const [pendingPhoneNumber, setPendingPhoneNumber] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [isHydratingSession, setIsHydratingSession] = useState(true);
  const hydrationSettledRef = useRef(false);
  const refreshingRef = useRef(false);

  const settleUnauthenticated = useCallback(() => {
    setUserState(null);
    setAccessToken(null);
    setPendingPhoneNumber(null);
    setError(null);
    setAuthStateState("unauthenticated");
    setAuthStatus("unauthenticated");
    setRolesStatus("resolved");
  }, []);

  const endHydration = useCallback(() => {
    if (hydrationSettledRef.current) return;
    hydrationSettledRef.current = true;
    setIsHydratingSession(false);
  }, []);

  const clearAuth = useCallback(() => {
    clearStoredAuth();
    localStorage.clear();
    sessionStorage.clear();
    void clearSession();

    settleUnauthenticated();
    endHydration();
  }, [endHydration, settleUnauthenticated]);

  const refreshUser = useCallback(
    async (tokenOverride?: string | null, options?: { deferHydrationEnd?: boolean }) => {
      const token = tokenOverride ?? accessToken ?? getStoredAccessToken() ?? getToken();

      if (refreshingRef.current) {
        return false;
      }

      refreshingRef.current = true;

      if (token) {
        setToken(token);
      }

      if (!options?.deferHydrationEnd) {
        setAuthStateState("loading");
        setAuthStatus("loading");
        setRolesStatus("loading");
      }

      try {
        const response = await getMe();
        const nextUser = resolveAuthUserFromResponse(response.data);

        if (!nextUser) {
          clearInvalidTokenArtifacts();
          settleUnauthenticated();
          return false;
        }

        if (token) {
          setToken(token);
          setStoredAccessToken(token);
        }
        setStoredUser(nextUser);
        if (token) {
          void writeSession({ accessToken: token, user: nextUser });
        }
        setAccessToken(token ?? null);
        setUserState(nextUser);

        setAuthStateState("authenticated");
        setAuthStatus("authenticated");
        setRolesStatus(hasResolvedRole(nextUser) ? "resolved" : "loading");
        setError(null);
        return true;
      } catch (error) {
        if (isUnauthorizedError(error)) {
          clearInvalidTokenArtifacts();
          settleUnauthenticated();
          return false;
        }

        clearAuth();
        return false;
      } finally {
        refreshingRef.current = false;
        if (!options?.deferHydrationEnd) {
          endHydration();
        }
      }
    },
    [accessToken, clearAuth, endHydration, settleUnauthenticated]
  );

  useEffect(() => {
    const token = getToken();

    if (!token) {
      settleUnauthenticated();
      setBootstrapped(true);
      endHydration();
      return;
    }

    setIsHydratingSession(true);

    void (async () => {
      try {
        const res = await getMe();
        const normalizedUser = resolveAuthUserFromResponse(res.data);

        if (!normalizedUser) {
          clearToken();
          settleUnauthenticated();
          return;
        }

        setStoredAccessToken(token);
        setStoredUser(normalizedUser);
        setAccessToken(token);
        setUserState(normalizedUser);
        setAuthStateState("authenticated");
        setAuthStatus("authenticated");
        setRolesStatus(hasResolvedRole(normalizedUser) ? "resolved" : "loading");
      } catch (error) {
        if (isUnauthorizedError(error)) {
          clearToken();
          settleUnauthenticated();
          return;
        }
        clearToken();
        settleUnauthenticated();
      } finally {
        setBootstrapped(true);
        endHydration();
      }
    })();
  }, [endHydration, settleUnauthenticated]);

  const startOtp = useCallback(async ({ phone }: OtpStartPayload) => {
    setPendingPhoneNumber(phone);
    setAuthStatus("pending");
    setRolesStatus("pending");
    const started = await authService.startOtp({ phone });
    return started !== false;
  }, []);

  const verifyOtp = useCallback(async (phone: string, code: string): Promise<OtpVerifyResult> => {
    setAuthStateState("loading");
    setAuthStatus("loading");
    setRolesStatus("loading");

    try {
      const result = await authService.loginWithOtp(phone, code);
      const token = result.token ?? getToken();

      if (token && token.trim().length > 0) {
        setToken(token);
        setStoredAccessToken(token);
        setAccessToken(token);
      }
      setPendingPhoneNumber(null);
      setAuthStateState("authenticated");
      setAuthStatus("authenticated");
      setRolesStatus("loading");
      setError(null);

      void refreshUser(token);

      return {
        success: true,
        token: token ?? undefined,
        user: result.user ?? null,
        nextPath: result.nextPath ?? "/portal"
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "OTP login failed";
      console.error("OTP login failed", err);
      setAuthStateState("unauthenticated");
      setAuthStatus("unauthenticated");
      setRolesStatus("resolved");
      setUserState(null);
      setAccessToken(null);
      setError(message);
      return { success: false, error: message };
    }
  }, [refreshUser]);

  const login = useCallback(async () => false, []);
  const loginWithOtp = verifyOtp;

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      clearAuth();
      destroyDevice();
      setCallStatus("idle");

      useDialerStore.getState().closeDialer();
      useDialerStore.getState().resetCall();

      if (typeof caches !== "undefined") {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }

      if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;
          registration.active?.postMessage({ type: "CLEAR_CACHES" });
        } catch {
          // ignore service worker readiness issues
        }

        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
      }
    }
  }, [clearAuth]);

  const testAuthOverride = getTestAuthOverride();
  const isTestAuthenticated = testAuthOverride?.isAuthenticated === true;
  const testRole = normalizeRole(testAuthOverride?.role ?? null);

  const testUser: AuthUser =
    isTestAuthenticated && !user
      ? normalizeAuthUser({ id: "test-user", role: testRole ?? "Admin", phone: "+15555550123" })
      : user;

  const isAuthenticated = isTestAuthenticated || authState === "authenticated";
  const isLoading = !isTestAuthenticated && (!bootstrapped || isHydratingSession || authState === "loading");

  const value = useMemo<AuthContextValue>(
    () => ({
      authState: isTestAuthenticated ? "authenticated" : authState,
      status: isTestAuthenticated ? "authenticated" : authStatus,
      authStatus: isTestAuthenticated ? "authenticated" : authStatus,
      rolesStatus: isTestAuthenticated ? "resolved" : rolesStatus,
      user: testUser,
      accessToken,
      token: accessToken,
      role: testRole ?? normalizeRole(testUser?.role ?? null),
      roles: normalizeUserRoles(testUser),
      allowedSilos: [],
      canAccessSilo: () => true,
      canAccessRole: (allowedRoles) => roleIn(testRole ?? normalizeRole(testUser?.role ?? null), allowedRoles),
      capabilities: testUser?.capabilities ?? [],
      error,
      pendingPhoneNumber,
      authenticated: isAuthenticated,
      isAuthenticated,
      isLoading,
      authReady: isTestAuthenticated ? true : !isHydratingSession,
      isHydratingSession: isTestAuthenticated ? false : isHydratingSession,
      login,
      startOtp,
      verifyOtp,
      loginWithOtp,
      refreshUser,
      clearAuth,
      logout,
      setAuth: setUserState,
      setUser: setUserState,
      setAuthenticated: () => undefined,
      setAuthState: setAuthStateState,
    }),
    [
      authState,
      authStatus,
      rolesStatus,
      testUser,
      accessToken,
      error,
      pendingPhoneNumber,
      isAuthenticated,
      isHydratingSession,
      isLoading,
      isTestAuthenticated,
      testRole,
      login,
      startOtp,
      verifyOtp,
      loginWithOtp,
      refreshUser,
      clearAuth,
      logout,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    if (process.env.NODE_ENV === "test") {
      return TEST_AUTH_STUB;
    }
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
};
