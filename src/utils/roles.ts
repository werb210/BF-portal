export const roleValues = ["Admin", "Staff", "Ops", "Viewer", "Lender", "Referrer"] as const;

export type UserRole = (typeof roleValues)[number];

export const fullStaffRoles: UserRole[] = ["Admin", "Staff", "Ops"];

export const canAccessMarketing = (role?: UserRole | null) => role === "Admin";
export const canAccessStaffPortal = (role?: UserRole | null) =>
  role != null && fullStaffRoles.includes(role);

export const canAccessLenderPortal = (role?: UserRole | null) => role === "Lender";
export const canAccessReferrerPortal = (role?: UserRole | null) => role === "Referrer";

export const hasRequiredRole = (role: UserRole | null | undefined, requiredRoles: UserRole[]) =>
  Boolean(role && requiredRoles.includes(role));

export const isUserRole = (role: string): role is UserRole => roleValues.includes(role as UserRole);

export const resolveUserRole = (role?: string | null): UserRole | null =>
  typeof role === "string" && isUserRole(role) ? role : null;

export const assertKnownRole = (role: string): asserts role is UserRole => {
  if (!isUserRole(role)) {
    throw new Error(`Invalid role: ${role}`);
  }
};

export const getRoleLabel = (role?: UserRole | null) => {
  switch (role) {
    case "Admin":
      return "Admin";
    case "Staff":
      return "Staff";
    case "Ops":
      return "Ops";
    case "Viewer":
      return "Viewer";
    case "Lender":
      return "Lender";
    case "Referrer":
      return "Referrer";
    default:
      return "Unassigned";
  }
};
