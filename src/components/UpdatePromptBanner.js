import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Button from "@/components/ui/Button";
import { useServiceWorkerUpdate } from "@/hooks/useServiceWorkerUpdate";
const UpdatePromptBanner = () => {
    const { updateAvailable, applyUpdate, dismiss } = useServiceWorkerUpdate();
    if (!updateAvailable)
        return null;
    return (_jsxs("div", { className: "update-banner", role: "status", "aria-live": "polite", children: [_jsx("span", { children: "Update available. Refresh to get the latest changes." }), _jsxs("div", { className: "update-banner__actions", children: [_jsx(Button, { variant: "secondary", onClick: () => void applyUpdate(), children: "Update now" }), _jsx(Button, { variant: "ghost", onClick: dismiss, children: "Later" })] })] }));
};
export default UpdatePromptBanner;
