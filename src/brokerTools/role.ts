// BF_PORTAL_v867_BROKER_TOOLS_2 - is the signed-in person an Admin? Reads the auth context directly, so it never throws outside
// the provider (tests, previews).
import { useContext } from "react";
import { AuthContext } from "@/auth/AuthContext";

export function useIsAdminRole(): boolean {
  const ctx = useContext(AuthContext);
  return String((ctx?.user as { role?: string } | null | undefined)?.role ?? "").toLowerCase() === "admin";
}
