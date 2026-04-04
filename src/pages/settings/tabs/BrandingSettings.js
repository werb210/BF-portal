import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import ErrorBanner from "@/components/ui/ErrorBanner";
import { useAuth } from "@/hooks/useAuth";
import { useSettingsStore } from "@/state/settings.store";
import { getErrorMessage } from "@/utils/errors";
const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024;
const ALLOWED_LOGO_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml", "image/webp"];
const BrandingSettings = () => {
    const { branding, fetchBranding, saveBranding, statusMessage, isLoadingBranding } = useSettingsStore();
    const { user } = useAuth();
    const isAdmin = user?.role === "Admin";
    const [localBranding, setLocalBranding] = useState(branding);
    const [formError, setFormError] = useState(null);
    useEffect(() => {
        setLocalBranding(branding);
    }, [branding]);
    useEffect(() => {
        let isMounted = true;
        fetchBranding().catch((error) => {
            if (!isMounted)
                return;
            setFormError(getErrorMessage(error, "Unable to load branding settings."));
        });
        return () => {
            isMounted = false;
        };
    }, [fetchBranding]);
    const handleLogo = (event) => {
        const file = event.target.files?.[0];
        if (!file)
            return;
        if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
            setFormError("Logo must be a PNG, JPG, SVG, or WebP image.");
            return;
        }
        if (file.size > MAX_LOGO_SIZE_BYTES) {
            setFormError("Logo must be under 2MB.");
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            const previewUrl = reader.result;
            setLocalBranding((prev) => ({ ...prev, logoUrl: previewUrl }));
            setFormError(null);
        };
        reader.onerror = () => setFormError("Unable to read the logo file.");
        reader.readAsDataURL(file);
    };
    const onSave = async () => {
        setFormError(null);
        try {
            await saveBranding(localBranding);
        }
        catch (error) {
            setFormError(getErrorMessage(error, "Unable to save branding settings."));
        }
    };
    const onLoadBranding = async () => {
        setFormError(null);
        try {
            await fetchBranding();
        }
        catch (error) {
            setFormError(getErrorMessage(error, "Unable to load branding settings."));
        }
    };
    const logoPreviewStyle = useMemo(() => ({
        width: `${localBranding.logoWidth}px`
    }), [localBranding.logoWidth]);
    return (_jsxs("section", { className: "settings-panel", "aria-label": "Branding settings", children: [_jsxs("header", { children: [_jsx("h2", { children: "Branding" }), _jsx("p", { children: "Upload a logo and size it for the portal header, emails, PDFs, and client apps." })] }), formError && _jsx(ErrorBanner, { message: formError }), _jsxs("div", { className: "branding-preview", children: [_jsxs("div", { children: [_jsx("p", { className: "ui-field__label", children: "Logo preview" }), _jsx("div", { className: "logo-preview__frame", children: localBranding.logoUrl ? (_jsx("img", { src: localBranding.logoUrl, alt: "Company logo preview", className: "logo-preview", style: logoPreviewStyle })) : (_jsx("span", { className: "text-sm text-slate-500", children: "No logo uploaded." })) })] }), _jsxs("div", { className: "branding-controls", children: [_jsxs("label", { className: "ui-field", children: [_jsx("span", { className: "ui-field__label", children: "Logo size" }), _jsx("input", { type: "range", min: 120, max: 360, step: 10, value: localBranding.logoWidth, onChange: (event) => setLocalBranding((prev) => ({
                                            ...prev,
                                            logoWidth: Number(event.target.value)
                                        })), disabled: !isAdmin, "aria-label": "Resize logo" })] }), isAdmin && _jsx("input", { type: "file", accept: "image/*", onChange: handleLogo, "aria-label": "Upload logo" }), !isAdmin && _jsx("p", { className: "ui-field__helper", children: "Admins can upload and resize the logo." })] })] }), _jsxs("div", { className: "settings-actions", children: [_jsx(Button, { type: "button", variant: "secondary", onClick: onLoadBranding, disabled: isLoadingBranding, title: isLoadingBranding ? "Branding is refreshing." : undefined, children: isLoadingBranding ? "Refreshing..." : "Refresh branding" }), isAdmin && (_jsx(Button, { type: "button", onClick: onSave, disabled: isLoadingBranding, title: isLoadingBranding ? "Branding is saving." : undefined, children: isLoadingBranding ? "Saving..." : "Save branding" })), statusMessage && _jsx("span", { role: "status", children: statusMessage })] })] }));
};
export default BrandingSettings;
