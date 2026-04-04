import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrowserAuthError, PublicClientApplication } from "@azure/msal-browser";
import api from "@/api";
import Button from "@/components/ui/Button";
import ErrorBanner from "@/components/ui/ErrorBanner";
import { useAuth } from "@/hooks/useAuth";
import { microsoftAuthConfig } from "@/config/microsoftAuth";
import { useSettingsStore } from "@/state/settings.store";
import { getErrorMessage } from "@/utils/errors";
import UserDetailsFields from "../components/UserDetailsFields";
import { logger } from "@/utils/logger";
const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;
const MAX_AVATAR_DIMENSION = 256;
const ProfileSettings = () => {
    const { user } = useAuth();
    const { profile, fetchProfile, saveProfile, statusMessage, isLoadingProfile, setMicrosoftConnection } = useSettingsStore();
    const [localProfile, setLocalProfile] = useState(profile);
    const [avatarError, setAvatarError] = useState(null);
    const [formError, setFormError] = useState(null);
    const [formErrors, setFormErrors] = useState({});
    const [microsoftError, setMicrosoftError] = useState(null);
    const [isLinkingMicrosoft, setIsLinkingMicrosoft] = useState(false);
    const [hideMicrosoftButton, setHideMicrosoftButton] = useState(false);
    const fileInputRef = useRef(null);
    const redirectHandledRef = useRef(false);
    useEffect(() => {
        setLocalProfile(profile);
    }, [profile]);
    useEffect(() => {
        let isMounted = true;
        fetchProfile().catch((error) => {
            if (!isMounted)
                return;
            setFormError(getErrorMessage(error, "Unable to load profile details."));
        });
        return () => {
            isMounted = false;
        };
    }, [fetchProfile]);
    const msalClient = useMemo(() => {
        if (!microsoftAuthConfig?.clientId)
            return null;
        const isIos = typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);
        return new PublicClientApplication({
            auth: {
                clientId: microsoftAuthConfig.clientId,
                authority: microsoftAuthConfig.authority,
                redirectUri: microsoftAuthConfig.redirectUri
            },
            cache: {
                cacheLocation: "sessionStorage",
                storeAuthStateInCookie: isIos
            }
        });
    }, []);
    const isMicrosoftConfigured = Boolean(microsoftAuthConfig?.clientId);
    const validateProfile = () => {
        const errors = {};
        if (!localProfile.firstName.trim())
            errors.firstName = "First name is required.";
        if (!localProfile.lastName.trim())
            errors.lastName = "Last name is required.";
        if (!localProfile.email.trim()) {
            errors.email = "Email is required.";
        }
        else if (!localProfile.email.includes("@")) {
            errors.email = "Enter a valid email.";
        }
        return errors;
    };
    const onSave = async (event) => {
        event.preventDefault();
        setFormError(null);
        const errors = validateProfile();
        setFormErrors(errors);
        if (Object.keys(errors).length > 0)
            return;
        try {
            await saveProfile({
                firstName: localProfile.firstName,
                lastName: localProfile.lastName,
                email: localProfile.email,
                phone: localProfile.phone,
                profileImage: localProfile.profileImage
            });
        }
        catch (error) {
            setFormError(getErrorMessage(error, "Unable to save profile."));
        }
    };
    const onLoadProfile = async () => {
        setFormError(null);
        try {
            await fetchProfile();
        }
        catch (error) {
            setFormError(getErrorMessage(error, "Unable to load profile details."));
        }
    };
    const loadImage = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = () => reject(new Error("Unable to read image."));
            image.src = reader.result;
        };
        reader.onerror = () => reject(new Error("Unable to read file."));
        reader.readAsDataURL(file);
    });
    const onFileChange = async (event) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.size > MAX_AVATAR_SIZE_BYTES) {
                setAvatarError("Avatar must be under 2MB.");
                return;
            }
            try {
                const image = await loadImage(file);
                const squareSize = Math.min(image.width, image.height);
                const cropX = (image.width - squareSize) / 2;
                const cropY = (image.height - squareSize) / 2;
                const outputSize = Math.min(squareSize, MAX_AVATAR_DIMENSION);
                const canvas = document.createElement("canvas");
                canvas.width = outputSize;
                canvas.height = outputSize;
                const context = canvas.getContext("2d");
                if (!context) {
                    throw new Error("Unable to prepare image preview.");
                }
                context.drawImage(image, cropX, cropY, squareSize, squareSize, 0, 0, outputSize, outputSize);
                const previewUrl = canvas.toDataURL("image/png");
                setLocalProfile((prev) => ({ ...prev, profileImage: previewUrl }));
                setAvatarError(null);
            }
            catch (error) {
                logger.error("Profile settings update failed", { error });
                setAvatarError("Unable to process that image. Please try a different file.");
            }
        }
    };
    const preferRedirect = typeof window !== "undefined" &&
        (window.matchMedia?.("(display-mode: standalone)").matches ||
            navigator.standalone ||
            /iphone|ipad|ipod/i.test(navigator.userAgent));
    const exchangeMicrosoftToken = useCallback(async (accessToken, accountEmail) => {
        const payload = {
            accessToken,
            accountEmail: accountEmail ?? undefined
        };
        const exchange = await api.post("/api/auth/microsoft", payload);
        const connectedEmail = exchange?.email ?? accountEmail ?? "";
        setMicrosoftConnection({ connected: true, email: connectedEmail });
    }, [setMicrosoftConnection]);
    useEffect(() => {
        if (!msalClient)
            return;
        let isMounted = true;
        const handleRedirect = async () => {
            if (redirectHandledRef.current)
                return;
            redirectHandledRef.current = true;
            try {
                const response = await msalClient.handleRedirectPromise();
                if (!response)
                    return;
                if (!isMounted)
                    return;
                setIsLinkingMicrosoft(true);
                const tokenResponse = response.accessToken
                    ? response
                    : await msalClient.acquireTokenSilent({
                        scopes: microsoftAuthConfig.scopes,
                        account: response.account ?? undefined
                    });
                await exchangeMicrosoftToken(tokenResponse.accessToken, response.account?.username);
            }
            catch (error) {
                if (!isMounted)
                    return;
                setMicrosoftError(getErrorMessage(error, "Microsoft sign-in failed."));
            }
            finally {
                if (isMounted) {
                    setIsLinkingMicrosoft(false);
                }
            }
        };
        void handleRedirect();
        return () => {
            isMounted = false;
        };
    }, [exchangeMicrosoftToken, msalClient]);
    const handleMicrosoftConnect = async () => {
        if (!msalClient || isLinkingMicrosoft)
            return;
        setMicrosoftError(null);
        setIsLinkingMicrosoft(true);
        try {
            if (preferRedirect) {
                await msalClient.loginRedirect({
                    scopes: microsoftAuthConfig.scopes
                });
                return;
            }
            const response = await msalClient.loginPopup({
                scopes: microsoftAuthConfig.scopes
            });
            const tokenResponse = response.accessToken
                ? response
                : await msalClient.acquireTokenSilent({
                    scopes: microsoftAuthConfig.scopes,
                    account: response.account ?? undefined
                });
            await exchangeMicrosoftToken(tokenResponse.accessToken, response.account?.username);
        }
        catch (error) {
            const authError = error;
            const isSilentFailure = error instanceof BrowserAuthError &&
                ["popup_window_error", "empty_window_error", "monitor_window_timeout"].includes(error.errorCode);
            if (isSilentFailure) {
                setHideMicrosoftButton(true);
                if (preferRedirect) {
                    try {
                        await msalClient.loginRedirect({ scopes: microsoftAuthConfig.scopes });
                        return;
                    }
                    catch (redirectError) {
                        setMicrosoftError(getErrorMessage(redirectError, "Microsoft sign-in failed."));
                    }
                }
            }
            setMicrosoftError(getErrorMessage(authError, "Microsoft sign-in failed."));
        }
        finally {
            setIsLinkingMicrosoft(false);
        }
    };
    const displayName = [localProfile.firstName, localProfile.lastName].filter(Boolean).join(" ").trim();
    const microsoftDisabledReason = !isMicrosoftConfigured
        ? "Microsoft OAuth is not configured."
        : hideMicrosoftButton
            ? "Microsoft sign-in requires a pop-up or redirect."
            : isLinkingMicrosoft
                ? "Microsoft sign-in is in progress."
                : "";
    return (_jsxs("form", { className: "settings-panel", onSubmit: onSave, "aria-label": "Profile settings", children: [_jsxs("header", { children: [_jsx("h2", { children: "My profile" }), _jsx("p", { children: "Update your name, phone, and avatar. OAuth connections open in a new window." })] }), formError && _jsx(ErrorBanner, { message: formError }), microsoftError && _jsx(ErrorBanner, { message: microsoftError }), _jsx("div", { className: "profile-summary", children: _jsxs("div", { children: [_jsx("p", { className: "ui-field__label", children: "Signed in as" }), _jsx("div", { className: "profile-summary__name", children: displayName || user?.name || "—" }), _jsx("div", { className: "profile-summary__email", children: localProfile.email }), _jsxs("div", { className: "profile-summary__email", children: ["Last login: ", localProfile.lastLogin ? new Date(localProfile.lastLogin).toLocaleString() : "Unavailable"] })] }) }), _jsx("div", { className: "settings-grid", children: _jsx(UserDetailsFields, { firstName: localProfile.firstName, lastName: localProfile.lastName, email: localProfile.email, phone: localProfile.phone, errors: formErrors, onChange: (updates) => setLocalProfile((prev) => ({ ...prev, ...updates })) }) }), _jsxs("div", { className: "avatar-upload", children: [_jsxs("div", { children: [_jsx("p", { className: "ui-field__label", children: "Profile image" }), localProfile.profileImage && (_jsx("img", { src: localProfile.profileImage, alt: "Profile preview", className: "avatar-preview" }))] }), _jsxs("div", { className: "avatar-actions", children: [_jsx("input", { type: "file", accept: "image/*", ref: fileInputRef, onChange: onFileChange, "aria-label": "Upload profile image" }), _jsx("p", { className: "avatar-helper", children: "Square crop enforced, max 256\u00D7256px, 2MB limit." }), avatarError && _jsx("p", { className: "ui-field__error", children: avatarError })] })] }), _jsxs("div", { className: "connected-accounts", children: [_jsx("h3", { children: "Connected accounts" }), _jsx("p", { children: "Connect optional services. OAuth prompts open in a new window." }), _jsxs("div", { className: "connected-accounts__actions", children: [_jsx(Button, { type: "button", variant: "secondary", onClick: handleMicrosoftConnect, disabled: !isMicrosoftConfigured || isLinkingMicrosoft || hideMicrosoftButton, title: !isMicrosoftConfigured || isLinkingMicrosoft || hideMicrosoftButton
                                    ? microsoftDisabledReason
                                    : undefined, children: profile.microsoftConnected ? "Microsoft 365 connected" : "Connect Microsoft 365" }), !isMicrosoftConfigured && (_jsx("span", { className: "text-xs text-slate-500", children: "Microsoft OAuth is not configured." })), hideMicrosoftButton && (_jsx("span", { className: "text-xs text-amber-600", children: "Microsoft sign-in needs a popup or redirect. Use a browser that allows pop-ups." })), profile.microsoftConnected && profile.microsoftAccountEmail && (_jsxs("span", { className: "text-xs text-emerald-600", children: ["Linked: ", profile.microsoftAccountEmail] })), !hideMicrosoftButton && isLinkingMicrosoft && (_jsx("span", { className: "text-xs text-slate-500", children: "Connecting\u2026" }))] })] }), _jsxs("div", { className: "settings-actions", children: [_jsx(Button, { type: "button", variant: "secondary", onClick: onLoadProfile, disabled: isLoadingProfile, title: isLoadingProfile ? "Profile is refreshing." : undefined, children: isLoadingProfile ? "Refreshing..." : "Refresh profile" }), _jsx(Button, { type: "submit", disabled: isLoadingProfile, title: isLoadingProfile ? "Profile is saving." : undefined, children: isLoadingProfile ? "Saving..." : "Save changes" }), statusMessage && _jsx("span", { role: "status", children: statusMessage })] })] }));
};
export default ProfileSettings;
