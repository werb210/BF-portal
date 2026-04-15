export type PortalRole = "Admin" | "Staff" | "Ops" | "Viewer" | "Lender" | "Referrer";

export type PortalCapabilities = {
  canRead: boolean;
  canWrite: boolean;
  canOverride: boolean;
};

const roleCapabilities: Record<PortalRole, PortalCapabilities> = {
  Admin: { canRead: true, canWrite: true, canOverride: true },
  Staff: { canRead: true, canWrite: true, canOverride: false },
  Ops: { canRead: true, canWrite: true, canOverride: false },
  Viewer: { canRead: true, canWrite: false, canOverride: false },
  Lender: { canRead: false, canWrite: false, canOverride: false },
  Referrer: { canRead: false, canWrite: false, canOverride: false }
};

export const resolvePortalRole = (role?: string | null): PortalRole => {
  if (
    role === "Admin" ||
    role === "Staff" ||
    role === "Ops" ||
    role === "Viewer" ||
    role === "Lender" ||
    role === "Referrer"
  ) {
    return role;
  }
  return "Viewer";
};

export const getPortalCapabilities = (role?: string | null): PortalCapabilities =>
  roleCapabilities[resolvePortalRole(role)];

export const canRead = (role?: string | null) => getPortalCapabilities(role).canRead;
export const canWrite = (role?: string | null) => getPortalCapabilities(role).canWrite;
export const canOverride = (role?: string | null) => getPortalCapabilities(role).canOverride;
