import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ErrorBoundary } from "react-error-boundary";
import Button from "../ui/Button";
const ErrorFallback = ({ error, resetErrorBoundary }) => {
    const safeError = error instanceof Error ? error : new Error(String(error));
    return (_jsxs("div", { className: "error-fallback", children: [_jsx("h2", { children: "Application Error" }), _jsx("pre", { children: safeError.message }), _jsx(Button, { onClick: resetErrorBoundary, children: "Reload" })] }));
};
const AppErrorBoundary = ({ children }) => {
    return _jsx(ErrorBoundary, { FallbackComponent: ErrorFallback, children: children });
};
export default AppErrorBoundary;
