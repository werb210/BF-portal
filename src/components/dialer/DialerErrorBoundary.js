import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ErrorBoundary } from "react-error-boundary";
import { getRequestId } from "@/utils/requestId";
import { useDialerStore } from "@/state/dialer.store";
import { logger } from "@/utils/logger";
const DialerFallback = ({ error, resetErrorBoundary }) => {
    const safeError = error instanceof Error ? error : new Error(String(error));
    const closeDialer = useDialerStore((state) => state.closeDialer);
    const resetCall = useDialerStore((state) => state.resetCall);
    return (_jsx("div", { className: "dialer", role: "status", "aria-live": "polite", children: _jsxs("div", { className: "dialer__panel", children: [_jsx("div", { className: "dialer__header", children: _jsxs("div", { children: [_jsx("p", { className: "dialer__eyebrow", children: "Outbound call" }), _jsx("h2", { className: "dialer__title", children: "Dialer unavailable" })] }) }), _jsxs("div", { className: "dialer__body", children: [_jsx("p", { className: "text-sm text-slate-600", children: "We hit an error while rendering the dialer. You can safely continue working in the portal." }), _jsxs("p", { className: "text-xs text-slate-500", children: ["Error: ", safeError.message] })] }), _jsx("div", { className: "dialer__footer", children: _jsx("button", { type: "button", className: "dialer__outcome", onClick: () => {
                            resetCall();
                            closeDialer();
                            resetErrorBoundary();
                        }, children: "Dismiss" }) })] }) }));
};
const DialerErrorBoundary = ({ children }) => {
    return (_jsx(ErrorBoundary, { FallbackComponent: DialerFallback, onError: (error, info) => {
            logger.error("Dialer render failure", {
                requestId: getRequestId(),
                error,
                componentStack: info.componentStack
            });
        }, children: children }));
};
export default DialerErrorBoundary;
