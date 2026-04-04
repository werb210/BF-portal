import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { canAccess } from "@/utils/permissions";
import { resolveUserRole } from "@/utils/roles";
export const useAuthorization = (params) => {
    const { user } = useAuth();
    return useMemo(() => canAccess({
        role: resolveUserRole(user?.role ?? null),
        allowedRoles: params.roles ?? [],
        requiredCapabilities: params.capabilities ?? [],
        userCapabilities: user?.capabilities ?? null
    }), [params.capabilities, params.roles, user]);
};
