import type { Role } from "@/auth/roles";

export type User = {
  role?: Role | "Viewer" | null;
} | null;

export function requireRole(user: User, roles: Role[]) {
  const userRole = user?.role;
  if (!userRole || !roles.some((role) => role === userRole)) {
    return false;
  }
  return true;
}
