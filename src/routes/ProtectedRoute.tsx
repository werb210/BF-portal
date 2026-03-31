import type { ReactElement } from "react";
import { getToken } from "@/auth/token";

export default function ProtectedRoute({ children }: { children: ReactElement }) {
  if (!getToken()) {
    throw new Error("AUTH_REQUIRED");
  }

  return children;
}
