import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from "react";
import { startLoaderWatchdog } from "@/utils/loaderWatchdog";
const AppLoading = () => {
    useEffect(() => {
        const stopWatchdog = startLoaderWatchdog();
        return () => stopWatchdog();
    }, []);
    return (_jsxs("div", { className: "app-loading", children: [_jsx("div", { className: "spinner", "aria-label": "Loading" }), _jsx("p", { children: "Loading experience..." })] }));
};
export default AppLoading;
