import type { ReactElement } from "react";
import { Navigate } from "react-router-dom";
import { getToken } from "@/lib/apiClient";

export default function ProtectedRoute({ children }: { children: ReactElement }) {
  if (!getToken()) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
