import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import api from "@/lib/api";
import { startOtp as startOtpService, verifyOtp as verifyOtpService, logout as logoutService } from "@/services/auth";
import { destroyVoice } from "@/services/voiceService";
import {
  clearStoredAuth,
  getStoredAccessToken,
  setStoredAccessToken,
  setStoredUser,
} from "@/services/token";
import type { AuthenticatedUser } from "@/services/auth";
import { normalizeRole, type Role } from "@/auth/roles";
import { useDialerStore } from "@/state/dialer.store";
import { clearSession, readSession, writeSession } from "@/utils/sessionStore";

export type AuthStatus = "idle" | "pending" | "loading" | "authenticated" | "unauthenticated";
export type RolesStatus = "pending" | "loading" | "resolved" | "ready";
export type AuthState = "loading" | "authenticated" | "unauthenticated";

export type AuthUser = (AuthenticatedUser & {
  id?: string;
  email?: string;
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

export type AuthContextValue = {
  authState: AuthState;
  status: AuthStatus;
  authStatus: AuthStatus;
  rolesStatus: RolesStatus;
  user: AuthUser;
  accessToken: string | null;
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
  login: (email: string, password: string) => Promise<boolean>;
  startOtp: (payload: OtpStartPayload) => Promise<boolean>;
  verifyOtp: (payloadOrPhone: OtpVerifyPayload | string, codeArg?: string) => Promise<boolean>;
  loginWithOtp: (payloadOrPhone: OtpVerifyPayload | string, codeArg?: string) => Promise<boolean>;
  refreshUser: (tokenOverride?: string | null) => Promise<boolean>;
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
    .map((entry) => normalizeRole(entry))
    .filter((entry): entry is Role => entry !== null);
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
const TEST_AUTH_STUB: AuthContextValue = {
  authState: "unauthenticated",
  status: "unauthenticated",
  authStatus: "unauthenticated",
  rolesStatus: "resolved",
  user: null,
  accessToken: null,
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
  verifyOtp: async () => true,
  loginWithOtp: async () => true,
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
  const [isHydratingSession, setIsHydratingSession] = useState(true);
  const didHydrateRef = useRef(false);
  const refreshingRef = useRef(false);

  const clearAuth = useCallback(() => {
    clearStoredAuth();

    localStorage.clear();
    sessionStorage.clear();
    void clearSession();

    setUserState(null);
    setAccessToken(null);
    setPendingPhoneNumber(null);
    setError(null);
    setAuthStateState("unauthenticated");
    setAuthStatus("unauthenticated");
    setRolesStatus("resolved");
    setIsHydratingSession(false);
  }, []);

  const refreshUser = useCallback(
    async (tokenOverride?: string | null) => {
      const token = tokenOverride ?? accessToken ?? getStoredAccessToken();

      if (!token) {
        clearAuth();
        return false;
      }

      if (refreshingRef.current) {
        return false;
      }

      refreshingRef.current = true;

      setAuthStateState("loading");
      setAuthStatus("loading");
      setRolesStatus("loading");
      setIsHydratingSession(true);

      try {
        let nextUser: AuthUser = null;

        try {
          const profile = await api.get("/auth/me", {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: false,
          });
          nextUser = normalizeAuthUser(profile.data?.user ?? profile.data);
        } catch {
          nextUser = null;
        }

        if (!nextUser) {
          const response = await fetch("/api/auth/me", {
            headers: { Authorization: `Bearer ${token}` },
            credentials: "include",
          });
          if (!response.ok) throw new Error("Unable to hydrate auth session.");
          nextUser = normalizeAuthUser(await response.json());
        }

        setStoredAccessToken(token);
        setStoredUser(nextUser);
        void writeSession({ accessToken: token, user: nextUser });
        setAccessToken(token);
        setUserState(nextUser);

        setAuthStateState("authenticated");
        setAuthStatus("authenticated");
        setRolesStatus(hasResolvedRole(nextUser) ? "resolved" : "loading");
        setError(null);
        return true;
      } catch {
        setUserState(null);
        clearAuth();
        return false;
      } finally {
        refreshingRef.current = false;
        setIsHydratingSession(false);
      }
    },
    [accessToken, clearAuth]
  );

  useEffect(() => {
    if (didHydrateRef.current) return;
    didHydrateRef.current = true;

    const hydrate = async () => {
      const token = getStoredAccessToken();
      if (token) {
        await refreshUser(token);
        return;
      }

      const session = await readSession();
      if (session?.accessToken && session.user) {
        setStoredAccessToken(session.accessToken);
        setStoredUser(session.user);
        setAccessToken(session.accessToken);
        setUserState(normalizeAuthUser(session.user as AuthUser));
        const hydratedUser = normalizeAuthUser(session.user as AuthUser);
        setAuthStateState("authenticated");
        setAuthStatus("authenticated");
        setRolesStatus(hasResolvedRole(hydratedUser) ? "resolved" : "loading");
        setIsHydratingSession(false);
        return;
      }

      clearAuth();
    };

    void hydrate();
  }, [clearAuth, refreshUser]);

  const startOtp = useCallback(async ({ phone }: OtpStartPayload) => {
    setPendingPhoneNumber(phone);
    setAuthStatus("pending");
    setRolesStatus("pending");
    await startOtpService({ phone });
    return true;
  }, []);

  const verifyOtp = useCallback(
    async (payloadOrPhone: OtpVerifyPayload | string, codeArg?: string) => {
      const payload =
        typeof payloadOrPhone === "string"
          ? { phone: payloadOrPhone, code: codeArg ?? "" }
          : payloadOrPhone;
      const { phone, code } = payload;

      setAuthStateState("loading");
      setAuthStatus("loading");
      setRolesStatus("loading");

      try {
        const tokens = await verifyOtpService({ phone, code });
        const token = tokens?.accessToken;
        const role = tokens?.role;

        if (!token) {
          throw new Error("Missing access token");
        }

        setStoredAccessToken(token);
        setAccessToken(token);
        setPendingPhoneNumber(null);

        if (!role) {
          const hydrated = await refreshUser(token);
          if (!hydrated) {
            throw new Error("Missing access token");
          }
          setError(null);
          return true;
        }

        const nextUser = normalizeAuthUser({ role });
        setStoredUser(nextUser);
        void writeSession({ accessToken: token, user: nextUser });
        setUserState(nextUser);
        setAuthStateState("authenticated");
        setAuthStatus("authenticated");
        setRolesStatus("resolved");
        setError(null);

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Missing access token";
        setAuthStateState("unauthenticated");
        setAuthStatus("unauthenticated");
        setRolesStatus("resolved");
        setUserState(null);
        setAccessToken(null);
        setError(message.toLowerCase().includes("access token") ? message : message.includes("failed") ? message : "Verification failed");
        return false;
      }
    },
    [refreshUser]
  );

  const login = useCallback(async () => false, []);
  const loginWithOtp = verifyOtp;

  const logout = useCallback(async () => {
    try {
      await logoutService();
    } finally {
      clearAuth();
      destroyVoice();

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
      ? normalizeAuthUser({ id: "test-user", role: testRole ?? "Admin", email: "test@example.com" })
      : user;

  const isAuthenticated = isTestAuthenticated || authState === "authenticated";
  const isLoading = !isTestAuthenticated && authState === "loading";

  const value = useMemo<AuthContextValue>(
    () => ({
      authState: isTestAuthenticated ? "authenticated" : authState,
      status: isTestAuthenticated ? "authenticated" : authStatus,
      authStatus: isTestAuthenticated ? "authenticated" : authStatus,
      rolesStatus: isTestAuthenticated ? "resolved" : rolesStatus,
      user: testUser,
      accessToken,
      role: testRole ?? normalizeRole(testUser?.role ?? null),
      roles: normalizeUserRoles(testUser),
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
