import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { getToken } from "@/services/token";

export default function PrivateRoute({
  children,
}: {
  children: ReactNode
  allowedRoles?: unknown
}) {
  const token = getToken();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
