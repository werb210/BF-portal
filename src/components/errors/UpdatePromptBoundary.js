import { jsx as _jsx } from "react/jsx-runtime";
import { ErrorBoundary } from "react-error-boundary";
import { getRequestId } from "@/utils/requestId";
import { logger } from "@/utils/logger";
const UpdatePromptFallback = () => (_jsx("div", { className: "update-banner", role: "status", "aria-live": "polite", children: _jsx("span", { children: "Update temporarily unavailable. Please refresh later." }) }));
const UpdatePromptBoundary = ({ children }) => {
    return (_jsx(ErrorBoundary, { FallbackComponent: UpdatePromptFallback, onError: (error, info) => {
            logger.error("Update prompt failed to render.", {
                requestId: getRequestId(),
                error,
                componentStack: info.componentStack
            });
        }, children: children }));
};
export default UpdatePromptBoundary;
