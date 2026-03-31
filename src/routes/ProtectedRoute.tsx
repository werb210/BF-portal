import type { ReactElement } from "react";
import { Navigate } from "react-router-dom";
import { getToken } from "@/services/token";

export default function ProtectedRoute({ children }: { children: ReactElement }) {
  if (!getToken()) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
