import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { rawApiFetch } from "@/api/index";
import { AUTH_STORAGE_KEY, authToken } from "@/lib/authToken";
import { decodeJwt } from "@/auth/jwt";
import { normalizeRole, type Role } from "@/auth/roles";
import { setAuthTelemetryContext } from "@/utils/uiTelemetry";

export type AuthStatus = "authenticated" | "unauthenticated" | "pending";
export type RolesStatus = "ready" | "loading";

export type AuthUser = {
  id: string;
  role: Role;
  name?: string;
  email?: string;
  first_name?: string;
  firstName?: string;
  last_name?: string;
  lastName?: string;
  silo?: string;
};

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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuidToken(token: string | null): boolean {
  if (!token) return false;

  try {
    const [, payloadB64] = token.split(".");
    if (!payloadB64) return false;

    const payload = JSON.parse(atob(payloadB64));
    const sub = payload?.sub ?? "";

    return UUID_REGEX.test(sub);
  } catch {
    return false;
  }
}

function getValidToken(): string | null {
  const token = authToken.get();
  if (!token) return null;
  if (token.length < 20) {
    authToken.clear();
    return null;
  }
  return token;
}

export function resolveTokenUser(token: string | null): AuthUser | null {
  if (!token) return null;
  const payload = decodeJwt(token) as {
    sub?: string;
    id?: string;
    role?: string;
    name?: string;
    email?: string;
    firstName?: string;
    first_name?: string;
    lastName?: string;
    last_name?: string;
    silo?: string;
  } | null;
  const role = normalizeRole(payload?.role ?? null);
  if (!role) return null;
  const firstName = payload?.firstName ?? payload?.first_name;
  const lastName = payload?.lastName ?? payload?.last_name;
  return {
    id: payload?.sub ?? payload?.id ?? "unknown",
    role,
    name: payload?.name ?? ([firstName, lastName].filter(Boolean).join(" ") || undefined),
    email: payload?.email,
    firstName,
    first_name: firstName,
    lastName,
    last_name: lastName,
    silo: payload?.silo,
  };
}

export function resolveApiUser(payload: unknown): AuthUser | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as { user?: unknown };
  const candidate = (root.user && typeof root.user === "object" ? root.user : payload) as {
    id?: string | number;
    sub?: string | number;
    role?: string;
    name?: string;
    email?: string;
  };
  const role = normalizeRole(candidate.role ?? null);
  if (!role) return null;
  const c = candidate as Record<string, unknown>;
  const firstName = (c.firstName as string | undefined)
    ?? (c.first_name as string | undefined);
  const lastName = (c.lastName as string | undefined)
    ?? (c.last_name as string | undefined);

  return {
    id: String(c.id ?? c.sub ?? "unknown"),
    role,
    name: (c.name as string | undefined)
      ?? ([firstName, lastName].filter(Boolean).join(" ") || undefined),
    email: c.email as string | undefined,
    firstName,
    first_name: firstName,
    lastName,
    last_name: lastName,
    silo: typeof c.silo === "string" ? c.silo : undefined,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => getValidToken());
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const syncToken = () => {
      setTokenState((current) => {
        const next = getValidToken();
        return current === next ? current : next;
      });
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === AUTH_STORAGE_KEY || event.key === "auth_token") {
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

  useEffect(() => {
    let isActive = true;

    setIsLoading(true);

    if (token && !isValidUuidToken(token)) {
      localStorage.removeItem("auth_token");
      authToken.clear();
      setTokenState(null);
      setUser(null);
      setIsLoading(false);
      return () => {
        isActive = false;
      };
    }

    rawApiFetch("/api/auth/me")
      .then(async (response) => {
        if (!isActive) return;
        if (response.status === 401) {
          localStorage.removeItem("auth_token");
          authToken.clear();
          setTokenState(null);
          setUser(null);
          return;
        }
        if (!response.ok) {
          setUser(resolveTokenUser(token));
          return;
        }
        const json = await response.json();
        const payload = (json as { data?: unknown })?.data ?? json;
        const apiUser = resolveApiUser(payload);
        setUser(apiUser ?? resolveTokenUser(token));
      })
      .catch(() => {
        if (!isActive) return;
        setUser(resolveTokenUser(token));
      })
      .finally(() => {
        if (!isActive) return;
        setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [token]);


  useEffect(() => {
    const userSilo = (user as { silo?: string } | null)?.silo
      ?? null;
    setAuthTelemetryContext({
      authStatus: isLoading ? "pending" : user ? "authenticated" : "unauthenticated",
      role: (user?.role as any) ?? null,
      silo: userSilo,
    });
  }, [isLoading, user]);

  const clearAuth = useCallback(() => {
    localStorage.removeItem("auth_token");
    authToken.clear();
    setTokenState(null);
    setUser(null);
  }, []);

  const role = user?.role ?? null;

  const value: AuthContextValue = useMemo(
    () => ({
      user,
      role,
      token,
      logout: clearAuth,
      clearAuth,
      authenticated: Boolean(user),
      isAuthenticated: Boolean(user),
      authStatus: isLoading ? "pending" : user ? "authenticated" : "unauthenticated",
      isLoading,
      rolesStatus: "ready",
      authReady: !isLoading,
      canAccessSilo: () => Boolean(user),
    }),
    [clearAuth, isLoading, role, token, user],
  );

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
