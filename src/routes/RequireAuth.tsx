import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import AccessRestricted from "@/components/auth/AccessRestricted";
import { roleIn, type Role } from "@/auth/roles";

export default function RequireAuth(
  { children, allowedRoles }: { children?: React.ReactNode; allowedRoles?: Role[] } = {}
) {
  const { authState, authReady, isAuthenticated, role, rolesStatus } = useAuth();

  if (!authReady || authState === "loading") {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (isAuthenticated && rolesStatus !== "resolved") {
    return null;
  }

  if (allowedRoles && rolesStatus === "resolved" && !roleIn(role, allowedRoles)) {
    return <AccessRestricted requiredRoles={allowedRoles} />;
  }

  return children ? <>{children}</> : <Outlet />;
}
