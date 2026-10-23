// BF_PORTAL_v849_KS_SILO - who sees the Keystone silo, and where it lives. The KS silo is a route (/silo/ks/*), not a
// BusinessUnit, so the BF/BI/SLF silo chosen in the topbar never becomes "KS".
//   - Keystone operations (dashboard, licensees, support, requests) talk to KS-Ops: Admin only (KS-Ops checks again:
//     Admin role, plus OPS_ADMIN_EMAILS when set).
//   - BF_PORTAL_v850_KS_CRM - the Keystone CRM (/silo/ks/crm/*: contacts, companies, sales pipeline, tasks) is the BF CRM
//     running with silo KS on BF-Server (X-Silo: KS, see src/config/api.ts). Admins, plus Staff / Marketing users whose
//     silo access (Settings > Users) includes KS - BF-Server applies the same rule.
export const KS_HOME = "/silo/ks/dashboard";
export const KS_CRM_HOME = "/silo/ks/crm/contacts";
export const KS_ACCENT = "#6D28D9";

function roleOf(user: unknown): string {
  return String((user as { role?: string | null } | null)?.role ?? "").trim().toLowerCase();
}

/** Keystone operations (KS-Ops screens): Admins only. */
export function canUseKeystone(user: unknown): boolean {
  return roleOf(user) === "admin";
}

/** The Keystone CRM: Admins, and Staff / Marketing users whose silo access includes KS. */
export function canUseKeystoneCrm(user: unknown): boolean {
  const role = roleOf(user);
  if (role === "admin") return true;
  if (role !== "staff" && role !== "marketing") return false;
  const silos = (user as { silos?: unknown } | null)?.silos;
  return Array.isArray(silos) && silos.some((s) => String(s).trim().toUpperCase() === "KS");
}

/** Anything in the Keystone silo (the topbar button and the Keystone sidebar). */
export function canSeeKeystone(user: unknown): boolean {
  return canUseKeystone(user) || canUseKeystoneCrm(user);
}

export function ksHomeFor(user: unknown): string {
  return canUseKeystone(user) ? KS_HOME : KS_CRM_HOME;
}

export function isKeystonePath(pathname: string | null | undefined): boolean {
  const p = String(pathname ?? "");
  return p === "/silo/ks" || p.startsWith("/silo/ks/");
}

export function isKeystoneCrmPath(pathname: string | null | undefined): boolean {
  const p = String(pathname ?? "");
  return p === "/silo/ks/crm" || p.startsWith("/silo/ks/crm/");
}

export const KS_NAV = [
  { label: "Dashboard", path: "/silo/ks/dashboard", roles: ["Admin"] },
  { label: "Licensees", path: "/silo/ks/licensees", roles: ["Admin"] },
  { label: "Support", path: "/silo/ks/tickets", roles: ["Admin"] },
  { label: "Requests", path: "/silo/ks/requests", roles: ["Admin"] },
  // BF_PORTAL_v850_KS_CRM - the Keystone CRM
  { label: "Contacts", path: "/silo/ks/crm/contacts", roles: ["Admin", "Staff", "Marketing"] },
  { label: "Companies", path: "/silo/ks/crm/companies", roles: ["Admin", "Staff", "Marketing"] },
  { label: "Sales pipeline", path: "/silo/ks/crm/pipeline", roles: ["Admin", "Staff", "Marketing"] },
  { label: "Tasks", path: "/silo/ks/crm/tasks", roles: ["Admin", "Staff", "Marketing"] },
];

/** The Keystone sidebar for this user: everything for Admins, the CRM links for KS-enabled staff. */
export function ksNavFor(user: unknown): typeof KS_NAV {
  if (canUseKeystone(user)) return KS_NAV;
  if (canUseKeystoneCrm(user)) return KS_NAV.filter((item) => isKeystoneCrmPath(item.path));
  return [];
}
