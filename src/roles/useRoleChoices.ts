// BF_PORTAL_v870_CRM_DATA_MODEL - the role dropdown on User Management: the built-in roles, then the active custom roles.
// Falls back to the built-in roles alone when /api/roles is unavailable (older server), so the screen keeps working.
import { useCallback, useEffect, useState } from "react";
import { BUILT_IN_ROLES, builtInChoice, customChoice, getRoles, type RoleRow } from "./rolesApi";

export type RoleOption = { value: string; label: string };

export function roleOptions(roles: RoleRow[]): RoleOption[] {
  return [
    ...BUILT_IN_ROLES.map((r) => ({ value: builtInChoice(r), label: r })),
    ...roles.filter((r) => !r.built_in && !r.archived_at).map((r) => ({ value: customChoice(r.id), label: `${r.name} (custom)` })),
  ];
}

export function useRoleChoices(): { options: RoleOption[]; roles: RoleRow[]; reload: () => void } {
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const load = useCallback(() => {
    let off = false;
    Promise.resolve()
      .then(() => getRoles())
      .then((r) => { if (!off) setRoles(Array.isArray(r?.roles) ? r.roles : []); })
      .catch(() => { if (!off) setRoles([]); });
    return () => { off = true; };
  }, []);
  useEffect(() => load(), [load]);
  return { options: roleOptions(roles), roles, reload: () => { load(); } };
}
