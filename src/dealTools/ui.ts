// BF_PORTAL_v872_DEAL_TOOLS - the few shared pieces the batch 5 screens use (quotes, ID verification, forecast,
// payment links): the signed-in role and the two button styles. Ported from KS-Portal's plans/ui without the plans.
import { useContext } from "react";
import { AuthContext } from "@/auth/AuthContext";
export { primaryButton, secondaryButton } from "@/brokerTools/ui";

/** The signed-in role, or null. Reads the context directly so it never throws outside AuthProvider. */
export function useRole(): string | null {
  const ctx = useContext(AuthContext);
  return ((ctx as { user?: { role?: string } | null } | null)?.user?.role as string | undefined) ?? null;
}

export function useIsAdmin(): boolean {
  return String(useRole() ?? "").toLowerCase() === "admin";
}
