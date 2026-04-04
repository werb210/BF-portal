import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { fetchLenderProfile, lenderLogin, sendLenderOtp, verifyLenderOtp } from "@/api/lender/auth";
import { configureLenderApiClient } from "@/api";
import { canAccessLenderPortal } from "@/utils/roles";
const STORAGE_KEY = "lender-portal.auth";
const PENDING_KEY = "lender-portal.pending";
const readStoredAuth = () => {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw)
            return { tokens: null, user: null };
        return JSON.parse(raw);
    }
    catch (error) {
        return { tokens: null, user: null };
    }
};
const readPendingState = () => {
    try {
        const raw = sessionStorage.getItem(PENDING_KEY);
        if (!raw)
            return { email: null, otpRequestId: null };
        return JSON.parse(raw);
    }
    catch (error) {
        return { email: null, otpRequestId: null };
    }
};
const persistAuth = (tokens, user) => {
    if (!tokens) {
        sessionStorage.removeItem(STORAGE_KEY);
        return;
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ tokens, user }));
};
const persistPending = (email, otpRequestId) => {
    if (!email && !otpRequestId) {
        sessionStorage.removeItem(PENDING_KEY);
        return;
    }
    sessionStorage.setItem(PENDING_KEY, JSON.stringify({ email, otpRequestId }));
};
const LenderAuthContext = createContext(undefined);
export const LenderAuthProvider = ({ children }) => {
    const [tokens, setTokens] = useState(() => readStoredAuth().tokens);
    const [user, setUser] = useState(() => readStoredAuth().user);
    const [isLoading, setIsLoading] = useState(true);
    const [pendingEmail, setPendingEmail] = useState(() => readPendingState().email);
    const [pendingOtpRequestId, setPendingOtpRequestId] = useState(() => readPendingState().otpRequestId);
    const logout = useCallback(() => {
        setTokens(null);
        setUser(null);
        setPendingEmail(null);
        setPendingOtpRequestId(null);
        persistAuth(null, null);
        persistPending(null, null);
    }, []);
    useEffect(() => {
        configureLenderApiClient({
            tokenProvider: () => tokens,
            onTokensUpdated: (nextTokens) => {
                setTokens(nextTokens);
                persistAuth(nextTokens, user);
            },
            onUnauthorized: logout
        });
    }, [tokens, user, logout]);
    const hydrateProfile = useCallback(async () => {
        if (!tokens || user) {
            setIsLoading(false);
            return;
        }
        try {
            const profile = await fetchLenderProfile();
            setUser(profile);
            persistAuth(tokens, profile);
        }
        catch (error) {
            logout();
        }
        finally {
            setIsLoading(false);
        }
    }, [tokens, user, logout]);
    useEffect(() => {
        hydrateProfile();
    }, [hydrateProfile]);
    const login = useCallback(async (payload) => {
        const response = await lenderLogin(payload);
        setPendingEmail(payload.email);
        setPendingOtpRequestId(response.otpRequestId);
        persistPending(payload.email, response.otpRequestId);
    }, []);
    const triggerOtp = useCallback(async (email) => {
        const targetEmail = email ?? pendingEmail;
        if (!targetEmail)
            return;
        await sendLenderOtp(targetEmail);
        setPendingEmail(targetEmail);
        persistPending(targetEmail, pendingOtpRequestId);
    }, [pendingEmail, pendingOtpRequestId]);
    const verifyOtpHandler = useCallback(async (payload) => {
        const email = payload.email || pendingEmail;
        if (!email) {
            throw new Error("Missing email for OTP verification");
        }
        const response = await verifyLenderOtp({
            ...payload,
            email,
            otpRequestId: pendingOtpRequestId ?? payload.otpRequestId
        });
        const nextTokens = {
            accessToken: response.accessToken,
            refreshToken: response.refreshToken
        };
        setTokens(nextTokens);
        setUser(response.user);
        setPendingEmail(null);
        setPendingOtpRequestId(null);
        persistAuth(nextTokens, response.user);
        persistPending(null, null);
    }, [pendingEmail, pendingOtpRequestId]);
    const value = useMemo(() => ({
        user,
        tokens,
        isAuthenticated: !!tokens?.accessToken && canAccessLenderPortal(user?.role),
        isLoading,
        pendingEmail,
        pendingOtpRequestId,
        login,
        triggerOtp,
        verifyOtp: verifyOtpHandler,
        logout
    }), [isLoading, login, logout, pendingEmail, pendingOtpRequestId, tokens, user, verifyOtpHandler]);
    return _jsx(LenderAuthContext.Provider, { value: value, children: children });
};
export default LenderAuthContext;
