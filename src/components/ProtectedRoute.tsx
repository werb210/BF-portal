import type { ReactNode } from "react";
import { useAuth } from "../auth/AuthContext";
import { useSilo } from "../context/SiloContext";
import AccessRestricted from "./auth/AccessRestricted";
import { roleIn, type Role } from "@/auth/roles";

type ProtectedRouteProps = {
  children: ReactNode;
  requiredRole?: Role;
};

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { role, canAccessSilo } = useAuth();
  const { silo: currentSilo } = useSilo();

  if (!role) return <div>Unauthorized</div>;

  if (!canAccessSilo(currentSilo)) {
    return <AccessRestricted message="You cannot access this silo." />;
  }

  if (requiredRole && !roleIn(role, [requiredRole])) {
    return <AccessRestricted message="Role requirements were not met." />;
  }

  return <>{children}</>;
}
