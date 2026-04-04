import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { registerAuthFailureHandler } from "@/auth/authEvents";
import { useAuth } from "@/auth/AuthContext";
import { recordRedirect } from "@/utils/redirectGuard";
let handledAuthFailure = false;
const shouldHandleReason = (reason) => reason === "unauthorized" || reason === "missing-token" || reason === "forbidden";
const isLoginRoute = (path) => path.startsWith("/login") || path.startsWith("/auth/");
export const resetPortalSessionGuard = () => {
    handledAuthFailure = false;
};
export const usePortalSessionGuard = () => {
    const { authStatus, clearAuth } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const latestLocationRef = useRef(location);
    useEffect(() => {
        latestLocationRef.current = location;
    }, [location]);
    useEffect(() => {
        if (authStatus === "authenticated") {
            resetPortalSessionGuard();
        }
    }, [authStatus]);
    useEffect(() => {
        const unregister = registerAuthFailureHandler((reason) => {
            if (!shouldHandleReason(reason))
                return;
            if (authStatus !== "authenticated")
                return;
            if (handledAuthFailure)
                return;
            handledAuthFailure = true;
            clearAuth();
            const { pathname, key } = latestLocationRef.current;
            if (isLoginRoute(pathname))
                return;
            try {
                recordRedirect(pathname, "session-expired", `session-${key}`);
            }
            catch {
                return;
            }
            navigate("/login", { replace: true });
        });
        return () => {
            unregister();
        };
    }, [authStatus, clearAuth, navigate]);
};
