import { useEffect, useRef } from "react";
import type { PropsWithChildren, ReactNode } from "react";
import AccessRestricted from "@/components/auth/AccessRestricted";
import AppLoading from "@/components/layout/AppLoading";
import { useAuth } from "@/hooks/useAuth";
import { emitUiTelemetry } from "@/utils/uiTelemetry";
import { resolveUserRole, type UserRole } from "@/utils/roles";
import { canAccess, type Capability } from "@/utils/permissions";

const defaultMessage = "You do not have permission to view this page.";

type RequireRoleProps = PropsWithChildren<{
  roles: UserRole[];
  capabilities?: Capability[];
  fallback?: ReactNode;
  message?: string;
}>;

const RequireRole = ({
  roles,
  capabilities = [],
  children,
  fallback,
  message = defaultMessage
}: RequireRoleProps) => {
  const { user, authStatus } = useAuth();
  const hasAccess = canAccess({
    role: resolveUserRole((user as { role?: string | null } | null)?.role ?? null),
    allowedRoles: roles,
    requiredCapabilities: capabilities,
    userCapabilities: (user as { capabilities?: Capability[] } | null)?.capabilities ?? null
  });
  const emittedRef = useRef(false);

  useEffect(() => {
    if (!hasAccess && authStatus === "authenticated" && !emittedRef.current) {
      emitUiTelemetry("permission_blocked", { requiredRoles: roles });
      emittedRef.current = true;
    }
  }, [authStatus, hasAccess, roles]);

  if (authStatus === "pending") {
    return <AppLoading />;
  }

  if (authStatus === "authenticated" && !hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return <AccessRestricted message={message} requiredRoles={roles} />;
  }

  return <>{children}</>;
};

export default RequireRole;
