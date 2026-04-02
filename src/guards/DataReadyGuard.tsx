import type { PropsWithChildren } from "react";
import AppLoading from "@/components/layout/AppLoading";
import RouteSkeleton from "@/components/layout/RouteSkeleton";
import { useAuth } from "@/auth/AuthContext";

const DataReadyGuard = ({ children }: PropsWithChildren) => {
  const { authStatus, rolesStatus, user, authReady } = useAuth();

  if (!authReady || authStatus === "pending" || rolesStatus === "loading") {
    return <RouteSkeleton label="Loading staff portal" />;
  }

  if (authStatus === "authenticated" && !user) {
    return <AppLoading />;
  }

  return <>{children}</>;
};

export default DataReadyGuard;
