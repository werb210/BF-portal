import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Button from "@/components/ui/Button";
const ErrorBanner = ({ message, onRetry }) => (_jsxs("div", { role: "alert", className: "flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900", children: [_jsx("span", { children: message }), onRetry && (_jsx(Button, { type: "button", variant: "ghost", onClick: onRetry, children: "Retry" }))] }));
export default ErrorBanner;
