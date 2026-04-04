import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Component } from "react";
import Card from "@/components/ui/Card";
import { getLastApiRequest } from "@/state/apiClientTrace";
import { getRequestId } from "@/utils/requestId";
import { logger } from "@/utils/logger";
const createErrorId = () => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    return `err_${Math.random().toString(36).slice(2, 10)}`;
};
class GlobalErrorBoundary extends Component {
    state = {};
    static getDerivedStateFromError(error) {
        return { error, errorId: createErrorId() };
    }
    componentDidCatch(error, info) {
        logger.error("GlobalErrorBoundary caught an error.", { requestId: getRequestId(), error, info });
    }
    render() {
        const { error, errorId } = this.state;
        if (!error) {
            return this.props.children;
        }
        const lastRequest = getLastApiRequest();
        const route = typeof window !== "undefined" ? window.location.pathname : "unknown";
        return (_jsx("div", { className: "page", children: _jsxs(Card, { title: "Unexpected error", children: [_jsx("div", { role: "alert", children: "Unexpected error" }), _jsxs("div", { className: "space-y-2 text-sm", children: [_jsx("p", { children: "We hit an error while loading this page. Please try again or contact support." }), _jsxs("p", { children: [_jsx("strong", { children: "Error ID:" }), " ", errorId] }), _jsxs("p", { children: [_jsx("strong", { children: "Route:" }), " ", route] }), _jsxs("p", { children: [_jsx("strong", { children: "Last API request:" }), " ", lastRequest
                                        ? `${lastRequest.method ?? "Unavailable"} ${lastRequest.path} (${lastRequest.status ?? "unknown"})${lastRequest.requestId ? ` [${lastRequest.requestId}]` : ""}`
                                        : "No recent request recorded."] })] })] }) }));
    }
}
export default GlobalErrorBoundary;
