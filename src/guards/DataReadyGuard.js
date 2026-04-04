import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import AppLoading from "@/components/layout/AppLoading";
import RouteSkeleton from "@/components/layout/RouteSkeleton";
import { useAuth } from "@/auth/AuthContext";
const DataReadyGuard = ({ children }) => {
    const { authStatus, rolesStatus, user, authReady } = useAuth();
    if (!authReady || authStatus === "pending" || rolesStatus === "loading") {
        return _jsx(RouteSkeleton, { label: "Loading staff portal" });
    }
    if (authStatus === "authenticated" && !user) {
        return _jsx(AppLoading, {});
    }
    return _jsx(_Fragment, { children: children });
};
export default DataReadyGuard;
