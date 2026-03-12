import { useAuth } from "@/auth/AuthContext";

export default function AuthProbe() {
  if (process.env.NODE_ENV !== "test") {
    return null;
  }

  const { isAuthenticated } = useAuth();
  return <div data-testid="auth-probe">{String(isAuthenticated)}</div>;
}
