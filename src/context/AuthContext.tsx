import React, { createContext, useContext, useEffect, useState } from "react";
import type { Silo } from "../types/silo";
import { normalizeRole, roleIn, type Role } from "@/auth/roles";
import { withApiBase } from "@/lib/apiBase";

export interface AuthContextValue {
  status: "loading" | "authenticated:resolved" | "unauthenticated";
  user: any | null;
  role: Role | null;
  token: string | null;
  allowedSilos: Silo[];
  canAccessSilo: (s: Silo) => boolean;
  canAccessRole: (roles: Role[]) => boolean;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] =
    useState<AuthContextValue["status"]>("loading");

  const [user, setUser] = useState<any | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [allowedSilos, setAllowedSilos] = useState<Silo[]>([]);
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("token")
  );

  const clearInvalidTokenArtifacts = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("boreal_staff_token");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("accessToken");
  };

  const hydrate = async () => {
    const storedToken = localStorage.getItem("token") ?? localStorage.getItem("boreal_staff_token");
    if (!storedToken) {
      setUser(null);
      setRole(null);
      setAllowedSilos([]);
      setStatus("unauthenticated");
      return;
    }

    try {
      const res = await fetch(withApiBase("/api/auth/me"), {
        credentials: "include",
        headers: {
          Authorization: `Bearer ${storedToken}`,
        },
      });

      if (res.status === 401) {
        clearInvalidTokenArtifacts();
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
        throw new Error("Unauthorized");
      }

      if (!res.ok) throw new Error();

      const data = await res.json();

      setUser(data);
      setRole(normalizeRole(data.role ?? null));
      setAllowedSilos(data.allowedSilos ?? []);
      setStatus("authenticated:resolved");
    } catch {
      setUser(null);
      setRole(null);
      setAllowedSilos([]);
      setStatus("unauthenticated");
    }
  };

  useEffect(() => {
    hydrate();
  }, []);

  const refresh = async () => {
    setStatus("loading");
    await hydrate();
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("persist");
    sessionStorage.removeItem("persist");
    setToken(null);
    setUser(null);
    setRole(null);
    setAllowedSilos([]);
    setStatus("unauthenticated");
  };

  const canAccessSilo = (s: Silo) => allowedSilos.includes(s);

  const canAccessRole = (allowedRoles: Role[]) => roleIn(role, allowedRoles);

  return (
    <AuthContext.Provider
      value={{
        status,
        user,
        role,
        token,
        allowedSilos,
        canAccessSilo,
        canAccessRole,
        logout,
        refresh,
      }}
    >
      <span data-testid="status">{status}</span>
      <span data-testid="location">{window.location.pathname}</span>
      {role && <span data-testid="role">{role}</span>}
      {status === "authenticated:resolved" && (
        <button onClick={logout}>Logout</button>
      )}
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
