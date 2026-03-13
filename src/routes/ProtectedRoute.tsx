import { Navigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";

export default function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { authenticated, authStatus, isHydratingSession } = useAuth();

  if (isHydratingSession || authStatus === "loading") {
    return null;
  }

  if (!authenticated || authStatus !== "authenticated") {
    return <Navigate to="/login" replace />;
  }

  return children;
}
