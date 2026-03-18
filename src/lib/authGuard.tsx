import type { JSX } from "react";
import { getToken } from "@/lib/auth";

interface GuardProps {
  children: JSX.Element;
  allowedRoles?: string[];
}

export function AuthGuard({ children }: GuardProps) {
  const token = getToken();

  if (!token) {
    window.location.href = "/login";
    return null;
  }

  return children;
}
