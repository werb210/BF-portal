import type { UserRole } from "@/utils/roles";
import { hasRequiredRole } from "@/utils/roles";

export type Capability = string;

export const hasCapabilities = (
  userCapabilities: Capability[] | null | undefined,
  requiredCapabilities: Capability[]
) => {
  if (requiredCapabilities.length === 0) return true;
  if (!userCapabilities || userCapabilities.length === 0) return false;
  return requiredCapabilities.every((capability) => userCapabilities.includes(capability));
};

export const canAccess = (params: {
  role?: UserRole | null;
  allowedRoles?: UserRole[];
  requiredCapabilities?: Capability[];
  userCapabilities?: Capability[] | null;
}) => {
  const { role, allowedRoles = [], requiredCapabilities = [], userCapabilities } = params;
  // BF_PORTAL_MARKETING_INHERITS_STAFF_v1 - a Marketing user has the same access
  // as a Staff user (the only difference is the Marketing tab, gated separately to
  // Admin+Marketing). Any guard that admits Staff also admits Marketing.
  const effectiveAllowed: UserRole[] =
    role === "Marketing" && allowedRoles.includes("Staff") && !allowedRoles.includes("Marketing")
      ? [...allowedRoles, "Marketing"]
      : allowedRoles;
  const roleAllowed = allowedRoles.length === 0 || hasRequiredRole(role, effectiveAllowed);
  const capabilityAllowed = hasCapabilities(userCapabilities, requiredCapabilities);
  return roleAllowed && capabilityAllowed;
};


export const canAccessLenderResource = (params: {
  role?: UserRole | null;
  userLenderId?: string | null;
  resourceLenderId?: string | null;
}) => {
  if (params.role === "Admin") return true;
  if (params.role !== "Lender") return false;
  if (!params.userLenderId || !params.resourceLenderId) return false;
  return params.userLenderId === params.resourceLenderId;
};
