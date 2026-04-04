import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useInstallPrompt } from "./useInstallPrompt";
export default function InstallBanner() {
    const { isInstallable, install } = useInstallPrompt();
    if (!isInstallable)
        return null;
    return (_jsxs("div", { className: "fixed bottom-20 left-4 right-4 bg-white text-black p-3 rounded-xl shadow-lg flex justify-between items-center", children: [_jsx("span", { className: "text-sm font-medium", children: "Install Boreal App" }), _jsx("button", { onClick: install, className: "bg-[#020C1C] text-white px-3 py-1 rounded-lg text-sm", children: "Install" })] }));
}
