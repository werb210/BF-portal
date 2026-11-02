// BF_PORTAL_v870_CRM_DATA_MODEL - BF-Server /api/roles (custom roles) and assigning a role to a person.
import { api } from "@/api";
import type { BaseRole, PermissionSet, Visibility } from "./permissionStore";

export type RoleRow = {
  id: string;
  name: string;
  description: string | null;
  base_role: BaseRole;
  permissions: PermissionSet;
  record_visibility: Visibility;
  archived_at?: string | null;
  users: number;
  built_in: boolean;
  read_only: boolean;
};
export type RolesOverview = {
  templates: RoleRow[];
  roles: RoleRow[];
  limits?: { roles: number; nameChars: number; descriptionChars: number };
};
export type RoleBody = { name: string; description?: string; base_role: BaseRole; permissions: PermissionSet; record_visibility: Visibility };

// The built-in roles people can be put on from User Management (Boreal's three; Ops stays a server role).
export const BUILT_IN_ROLES: BaseRole[] = ["Admin", "Staff", "Marketing"];

export const getRoles = () => api.get<RolesOverview>("/api/roles");
export const createRole = (body: RoleBody) => api.post<{ role: RoleRow; dropped: string[] }>("/api/roles", body);
export const updateRole = (id: string, body: Partial<RoleBody>) => api.patch<{ role: RoleRow; dropped: string[] }>(`/api/roles/${id}`, body);
export const setRoleArchived = (id: string, archived: boolean) => api.post(`/api/roles/${id}/${archived ? "archive" : "unarchive"}`);

/** A role choice in a dropdown: "builtin:Staff" or "custom:<id>". */
export type RoleChoice = string;
export const builtInChoice = (role: string) => `builtin:${role}`;
export const customChoice = (id: string) => `custom:${id}`;

/** The dropdown value for a user row from GET /api/users. */
export function choiceForUser(u: { role?: string | null; custom_role_id?: string | null }): RoleChoice {
  if (u.custom_role_id) return customChoice(u.custom_role_id);
  const r = String(u.role ?? "Staff");
  const match = BUILT_IN_ROLES.find((b) => b.toLowerCase() === r.toLowerCase());
  return builtInChoice(match ?? "Staff");
}

/** The body for PATCH /api/users/:id or POST /api/users that puts a person on the chosen role. */
export function bodyForChoice(choice: RoleChoice, roles: RoleRow[]): { role?: string; custom_role_id?: string } {
  if (choice.startsWith("custom:")) {
    const id = choice.slice("custom:".length);
    const base = roles.find((r) => r.id === id)?.base_role;
    return base ? { role: base, custom_role_id: id } : { custom_role_id: id };
  }
  return { role: choice.slice("builtin:".length) || "Staff" };
}

export async function assignRole(userId: string, choice: RoleChoice, roles: RoleRow[]): Promise<void> {
  await api.patch(`/api/users/${userId}`, bodyForChoice(choice, roles));
}
