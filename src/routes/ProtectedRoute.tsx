import { getToken } from "@/lib/auth";

export default function ProtectedRoute({ children }: { children: JSX.Element }) {
  const token = getToken();

  if (!token) {
    window.location.href = "/login";
    return null;
  }

  return children;
}
