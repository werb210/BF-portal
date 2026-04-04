import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { useAuth } from "../hooks/useAuth";
import { canAccess } from "@/utils/permissions";
import { resolveUserRole } from "@/utils/roles";
export function RequireRole({ allow, capabilities = [], children }) {
    const { user } = useAuth();
    const hasAccess = canAccess({
        role: resolveUserRole(user?.role ?? null),
        allowedRoles: allow,
        requiredCapabilities: capabilities,
        userCapabilities: user?.capabilities ?? null
    });
    if (!user || !hasAccess) {
        return _jsx("div", { role: "alert", children: "Access denied" });
    }
    return _jsx(_Fragment, { children: children });
}
