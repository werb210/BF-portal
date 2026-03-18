import React from "react";
import { Outlet } from "react-router-dom";
import { getToken } from "@/lib/auth";

export default function RequireAuth(
  { children }: { children?: React.ReactNode; allowedRoles?: unknown } = {}
) {
  const token = getToken();

  if (!token) {
    window.location.href = "/login";
    return null;
  }

  return children ? <>{children}</> : <Outlet />;
}
