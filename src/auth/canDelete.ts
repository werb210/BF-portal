import type { Role } from "./roles";

export function canDelete(role: Role | null | undefined): boolean {
  return role === "Admin";
}
