import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useSilo } from "../context/SiloContext";
import AccessRestricted from "./auth/AccessRestricted";
import { roleIn, type Role } from "@/auth/roles";

type ProtectedRouteProps = {
  children: ReactNode;
  requiredRole?: Role;
};

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { role, canAccessSilo, authStatus, token } = useAuth();
  const { silo: currentSilo } = useSilo();

  if (authStatus === "pending") return null;
  if (!token && authStatus === "unauthenticated") return <Navigate to="/login" replace />;

  if (!role) return <div>Unauthorized</div>;

  if (!canAccessSilo(currentSilo)) {
    return <AccessRestricted message="You cannot access this silo." />;
  }

  if (requiredRole && !roleIn(role, [requiredRole])) {
    return <AccessRestricted message="Role requirements were not met." />;
  }

  return <>{children}</>;
}
