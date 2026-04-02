import { useEffect, useState } from "react";
import type { JwtPayload } from "./jwt";
import { getToken } from "./token";
import { decodeJwt } from "./jwt";

type AuthState =
  | { status: "pending" }
  | { status: "unauthenticated" }
  | { status: "authenticated"; user: JwtPayload };

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ status: "pending" });

  useEffect(() => {
    const token = getToken();
    const decoded = decodeJwt(token) as JwtPayload | null;

    if (!decoded) {
      setState({ status: "unauthenticated" });
      return;
    }

    setState({ status: "authenticated", user: decoded });
  }, []);

  return state;
}
