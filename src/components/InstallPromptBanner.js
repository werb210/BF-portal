import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import Button from "@/components/ui/Button";
const InstallPromptBanner = () => {
    const { canInstall, promptInstall, dismiss } = useInstallPrompt();
    if (!canInstall)
        return null;
    return (_jsxs("div", { className: "install-banner", role: "status", "aria-live": "polite", children: [_jsx("span", { children: "Install the Staff Portal for faster access and offline support." }), _jsxs("div", { className: "install-banner__actions", children: [_jsx(Button, { variant: "secondary", onClick: () => void promptInstall(), children: "Install App" }), _jsx(Button, { variant: "ghost", onClick: dismiss, children: "Not now" })] })] }));
};
export default InstallPromptBanner;
