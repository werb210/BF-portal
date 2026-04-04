import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef } from "react";
import AccessRestricted from "@/components/auth/AccessRestricted";
import AppLoading from "@/components/layout/AppLoading";
import { useAuth } from "@/hooks/useAuth";
import { emitUiTelemetry } from "@/utils/uiTelemetry";
import { resolveUserRole } from "@/utils/roles";
import { canAccess } from "@/utils/permissions";
const defaultMessage = "You do not have permission to view this page.";
const RequireRole = ({ roles, capabilities = [], children, fallback, message = defaultMessage }) => {
    const { user, authStatus } = useAuth();
    const hasAccess = canAccess({
        role: resolveUserRole(user?.role ?? null),
        allowedRoles: roles,
        requiredCapabilities: capabilities,
        userCapabilities: user?.capabilities ?? null
    });
    const emittedRef = useRef(false);
    useEffect(() => {
        if (!hasAccess && authStatus === "authenticated" && !emittedRef.current) {
            emitUiTelemetry("permission_blocked", { requiredRoles: roles });
            emittedRef.current = true;
        }
    }, [authStatus, hasAccess, roles]);
    if (authStatus === "pending") {
        return _jsx(AppLoading, {});
    }
    if (authStatus === "authenticated" && !hasAccess) {
        if (fallback) {
            return _jsx(_Fragment, { children: fallback });
        }
        return _jsx(AccessRestricted, { message: message, requiredRoles: roles });
    }
    return _jsx(_Fragment, { children: children });
};
export default RequireRole;
