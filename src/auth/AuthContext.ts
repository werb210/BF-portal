import { useMemo } from "react";

import { decodeJwt } from "@/auth/jwt";
import { getToken } from "@/auth/token";
import { normalizeRole, type Role } from "@/auth/roles";

type AuthStatus = "authenticated" | "unauthenticated";

export function useAuth(): { role: Role | null; authenticated: boolean; authStatus: AuthStatus } {
  return useMemo(() => {
    const token = getToken();
    if (!token) {
      return { role: null, authenticated: false, authStatus: "unauthenticated" as const };
    }

    const payload = decodeJwt(token);
    const role = normalizeRole(payload?.role ?? payload?.user_role ?? null);
    return { role, authenticated: true, authStatus: "authenticated" as const };
  }, []);
}
