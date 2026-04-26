import type { UserRole } from "./roles";

export function canDelete(role: UserRole | null | undefined): boolean {
  return role === "Admin";
}
