// BF_PORTAL_v849_KS_SILO - who sees the Keystone silo, and where it lives. Admin only (KS-Ops checks again on its
// side: Admin role, plus OPS_ADMIN_EMAILS when set). The KS silo is a route (/silo/ks/*), not a BusinessUnit, so the
// active BF/BI/SLF silo (and the X-Silo header BF-Server sees) never becomes "KS".
export const KS_HOME = "/silo/ks/dashboard";
export const KS_ACCENT = "#6D28D9";

export function canUseKeystone(user: unknown): boolean {
  const role = (user as { role?: string | null } | null)?.role;
  return String(role ?? "").trim().toLowerCase() === "admin";
}

export function isKeystonePath(pathname: string | null | undefined): boolean {
  const p = String(pathname ?? "");
  return p === "/silo/ks" || p.startsWith("/silo/ks/");
}

export const KS_NAV = [
  { label: "Dashboard", path: "/silo/ks/dashboard", roles: ["Admin"] },
  { label: "Licensees", path: "/silo/ks/licensees", roles: ["Admin"] },
  { label: "Support", path: "/silo/ks/tickets", roles: ["Admin"] },
  { label: "Requests", path: "/silo/ks/requests", roles: ["Admin"] },
];
