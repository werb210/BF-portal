import type { ReactNode } from "react";
import { getToken } from "@/lib/auth";

export default function PrivateRoute({
  children,
}: {
  children: ReactNode
  allowedRoles?: unknown
}) {
  const token = getToken();

  if (!token) {
    window.location.href = "/login";
    return null;
  }

  return <>{children}</>;
}
