import type { ReactElement } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";

export default function ProtectedRoute({ children }: { children: ReactElement }) {
  const { authStatus, authenticated } = useAuth();

  if (authStatus === "loading" || authStatus === "pending") {
    return null;
  }

  if (!authenticated || authStatus !== "authenticated") {
    return <Navigate to="/login" replace />;
  }

  return children;
}
