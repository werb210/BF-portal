import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export default function AuthGuard({ children }: { children: JSX.Element }) {
  const { authStatus, authenticated } = useAuth();

  if (authStatus === "pending") {
    return <div>Loading...</div>;
  }

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
