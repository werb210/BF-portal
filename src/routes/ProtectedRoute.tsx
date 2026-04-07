// @ts-nocheck
import { Navigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";

export default function ProtectedRoute({ children }) {
  const { authStatus, user } = useAuth();

  if (authStatus === "pending") {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
